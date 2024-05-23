// The module 'vscode' contains the VS Code extensibility API.
// Import the module and reference it with the alias vscode in your code below.
import * as vscode from 'vscode';
// For CSV parsing.
// TODO: CSV parsing.
import * as csv from '@fast-csv/parse';
// For rendering templates.
import Mustache from 'mustache';
// For template reading.
import * as fs from 'fs';

// This method is called when your extension is activated.
// Your extension is activated the very first time the command is executed.
export function activate(context: vscode.ExtensionContext) {

	context.subscriptions.push(
		vscode.commands.registerCommand('fhir-terminology-generator-vscode.start', () => {

			FhirTerminologyGeneratorPanel.createOrShow(context.extensionUri);
		})
	);

	if (vscode.window.registerWebviewPanelSerializer) {
		// Make sure we register a serializer in activation event.
		vscode.window.registerWebviewPanelSerializer(FhirTerminologyGeneratorPanel.viewType, {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
				// TODO: review 'console.log'.
				console.log(`Got state: ${state}`);
				// Reset the webview options so we use latest uri for `localResourceRoots`.
				webviewPanel.webview.options = getWebviewOptions(context.extensionUri);
				FhirTerminologyGeneratorPanel.revive(webviewPanel, context.extensionUri);
			}
		});
	}
}

// Return the Webview options.
function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {

	return {
		// Enable javascript in the webview.
		enableScripts: true,
		// And restrict the webview to only loading content from our extension's `media` directory.
		localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
	};
}

/**
 * Manage the FHIR® Terminology Generator Webview panel.
 */
class FhirTerminologyGeneratorPanel {
	// Track the currently panel. Only allow a single panel to exist at a time.
	public static currentPanel: FhirTerminologyGeneratorPanel | undefined;
	// For controlling the exhibition of a single panel of the specified type.
	public static readonly viewType = 'fhirTerminologyGenerator';
	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];

	// Create the panel or show the current one (if it already exists).
	public static createOrShow(extensionUri: vscode.Uri) {

		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		// If we already have a panel, show it.
		if (FhirTerminologyGeneratorPanel.currentPanel) {
			FhirTerminologyGeneratorPanel.currentPanel._panel.reveal(column);
			return;
		}

		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(
			FhirTerminologyGeneratorPanel.viewType,
			'FHIR® Terminology Generator - R5',
			column || vscode.ViewColumn.One,
			getWebviewOptions(extensionUri)
		);

		FhirTerminologyGeneratorPanel.currentPanel = new FhirTerminologyGeneratorPanel(panel, extensionUri);
	}

	// Revive a panel.
	public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {

		FhirTerminologyGeneratorPanel.currentPanel = new FhirTerminologyGeneratorPanel(panel, extensionUri);
	}

	// The FhirTerminologyGeneratorPanel class constructor.
	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {

		this._panel = panel;
		this._extensionUri = extensionUri;

		// Set the Webview's initial HTML content.
		this._update();

		// Listen for when the panel is disposed.
		// This happens when the user closes the panel or when the panel is closed programmatically.
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Update the content based on view changes.
		this._panel.onDidChangeViewState(
			e => {
				if (this._panel.visible) {
					this._update();
				}
			},
			null,
			this._disposables
		);

		// Handle messages from the Webview.
		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'CodeSystem':
						const commonTemplate = this._fillCodeSystemTemplate(message.text);
						// Create a new document with the terminology's contet.
						vscode.workspace.openTextDocument({
							//content: message.text,
							content: commonTemplate,
							language: "json"
						}).then(newDocument => {
							vscode.window.showTextDocument(newDocument);
						});
						vscode.window.setStatusBarMessage(message.text);
						return;
					case 'ValueSet':
						// Create a new document with the terminology's contet.
						vscode.workspace.openTextDocument({
							content: message.text,
							language: "json"
						}).then(newDocument => {
							vscode.window.showTextDocument(newDocument);
						});
						vscode.window.setStatusBarMessage(message.text);
						return;
					}
			},
			null,
			this._disposables
		);
	}

	// Dispose the Webview panel.
	public dispose() {

		FhirTerminologyGeneratorPanel.currentPanel = undefined;

		// Clean up our resources.
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _update() {

		// The Webview instance.
		const webview = this._panel.webview;
		// The panel's title.
		this._panel.title = 'FHIR® Terminology Generator - R5';
		// The panel's HTML content.
		this._panel.webview.html = this._getHtmlForWebview(webview);
	}

	// Fill the CodeSystem template with the input data.
	private _fillCodeSystemTemplate(content: string) {

		// Load the common template from disk.
		const commonTemplatePath = vscode.Uri.joinPath(this._extensionUri, 'media', 'common.mustache');
		const commonTemplate = fs.readFileSync(commonTemplatePath.fsPath, { encoding: 'utf8' });

		// Load the CodeSystem template from disk.
		const codeSystemTemplatePath = vscode.Uri.joinPath(this._extensionUri, 'media', 'CodeSystem.mustache');
		const codeSystemTemplate = fs.readFileSync(codeSystemTemplatePath.fsPath, { encoding: 'utf8' });

		// Fill the template with the input data.
		const filledTemplate = Mustache.render(codeSystemTemplate, JSON.parse(content), { common: commonTemplate });

		return filledTemplate;
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		// Local path to main script run in the Webview.
		const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'script.js');
		// And the URI we use to load this script in the Webview.
		const scriptUri = webview.asWebviewUri(scriptPathOnDisk);
		// Local path to CSS styles.
		const styleResetPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css');
		const stylesPathMainPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css');
		// URI to load styles into the Webview.
		const stylesResetUri = webview.asWebviewUri(styleResetPath);
		const stylesMainUri = webview.asWebviewUri(stylesPathMainPath);
		// Use a nonce to only allow specific scripts to be run.
		const nonce = getNonce();

		return `<!DOCTYPE html>
		<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${stylesResetUri}" rel="stylesheet">
				<link href="${stylesMainUri}" rel="stylesheet">
				<title>FHIR® Terminology Generator - R5</title>
			</head>
			<body>
				<h1>FHIR® Terminology Generator - R5</h1>
				<label for="terminologyInstance">Terminology instance type:</label>
				<div class="radiogroup">
					<input type="radio" id="codeSystem" name="terminologyInstance" value="CodeSystem" checked>
					<label for="codesystem">CodeSystem</label>
					<input type="radio" id="valueSet" name="terminologyInstance" value="ValueSet">
					<label for="valueSet">ValueSet</label>
				</div>
				<hr />
				<div id="commonDiv">
					<label for="url">url (canonical identifier for this instance):</label><br />
					<input type="text" id="url" name="url" size="100" /><br />
					<hr />
					<label for="version">version (business version for this instance):</label><br />
					<input type="text" id="version" name="version" size="50" /><br />
					<hr />
					<label for="name">name (name for this instance (computer friendly)):</label><br />
					<input type="text" id="name" name="name" size="100" /><br />
					<hr />
					<label for="title">title (name for this instance (human friendly)):</label><br />
					<input type="text" id="title" name="title" size="100" /><br />
					<hr />
					<label for="status">status (the status of this instance):</label>
					<div id="statusRadioGroupDiv" class="radiogroup">
						<input type="radio" id="statusDraft" name="status" value="draft" checked>
						<label for="statusDraft">draft</label>
						<input type="radio" id="statusActive" name="status" value="active">
						<label for="statusActive">active</label>
						<input type="radio" id="statusRetired" name="status" value="retired">
						<label for="statusRetired">retired</label>
						<input type="radio" id="statusUnknown" name="status" value="unknown">
						<label for="statusUnknown">unknown</label>
					</div>
					<hr />
					<label for="experimental">experimental (for testing purposes, not real usage):</label>
					<div class="radiogroup">
						<input type="radio" id="experimentalTrue" name="experimental" value="true">
						<label for="experimentalTrue">true</label>
						<input type="radio" id="experimentalFalse" name="experimental" value="false">
						<label for="experimentalFalse">false</label>
						<button type="button" id="clearExperimental">Clear</button>
					</div>
					<hr />
					<!-- TODO: regexp -->
					<label for="date">date (date of the last change (in the format YYYY, YYYY-MM, YYYY-MM-DD or YYYY-MM-DDThh:mm:ss+zz:zz)):</label><br />
					<input type="text" id="date" name="date" size="50" /><br />
					<hr />
					<label for="publisher">publisher (name of the publisher/steward (organization or individual)):</label><br />
					<input type="text" id="publisher" name="publisher" size="100" /><br />
					<hr />
					<label for="description">description (natural language description for the instance):</label><br />
					<textarea id="description" name="description" rows="3" cols="100"></textarea><br />
					<hr />
					<label for="purpose">purpose (why this instance is defined):</label><br />
					<textarea id="purpose" name="purpose" rows="3" cols="100"></textarea><br />
					<hr />
					<label for="copyright">copyright (use and/or publishing restrictions):</label><br />
					<textarea id="copyright" name="copyright" rows="3" cols="100"></textarea><br />
					<hr />
					<label for="copyrightLabel">copyrightLabel (copyright holder and year(s)):</label><br />
					<input type="text" id="copyrightLabel" name="copyrightLabel" size="100" /><br />
					<hr />
					<!-- TODO: regexp -->
					<label for="approvalDate">approvalDate (when the instance was approved by publisher (in the format YYYY, YYYY-MM, or YYYY-MM-DD)):</label><br />
					<input type="text" id="approvalDate" name="approvalDate" size="50" /><br />
					<hr />
					<!-- TODO: regexp -->
					<label for="lastReviewDate">lastReviewDate (when the instance was last reviewed by the publisher (in the format YYYY, YYYY-MM, or YYYY-MM-DD)):</label><br />
					<input type="text" id="lastReviewDate" name="lastReviewDate" size="50" /><br />
					<hr />
				</div>
				<div id="codeSystemDiv">
					<label for="content">content (the extent of the content of the code system):</label>
					<div class="radiogroup">
						<input type="radio" id="contentNotPresent" name="content" value="not-present" checked>
						<label for="contentNotPresent">not-present</label>
						<input type="radio" id="contentExample" name="content" value="example">
						<label for="contentExample">example</label>
						<input type="radio" id="contentFragment" name="content" value="fragment">
						<label for="contentFragment">fragment</label>
						<input type="radio" id="contentComplete" name="content" value="complete">
						<label for="contentComplete">complete</label>
						<input type="radio" id="contentSupplement" name="content" value="supplement">
						<label for="contentSupplement">supplement</label>
					</div>
					<hr />
					<label for="caseSensitive">caseSensitive (if code comparison is case sensitive):</label>
					<div class="radiogroup">
						<input type="radio" id="caseSensitiveTrue" name="caseSensitive" value="true">
						<label for="caseSensitiveTrue">true</label>
						<input type="radio" id="caseSensitiveFalse" name="caseSensitive" value="false">
						<label for="caseSensitiveFalse">false</label>
						<button type="button" id="clearCaseSensitive">Clear</button>
					</div>
					<hr />
					<label for="canonicalValueSet">valueSet (canonical reference to the value set with entire code system):</label><br />
					<input type="text" id="canonicalValueSet" name="canonicalValueSet" size="100" /><br />
					<hr />
						<label for="hierarchyMeaning">hierarchyMeaning (the meaning of the hierarchy of concepts):</label>
						<div class="radiogroup">
						<input type="radio" id="hierarchyMeaningGroupedBy" name="hierarchyMeaning" value="grouped-by">
						<label for="hierarchyMeaningGroupedBy">grouped-by</label>
						<input type="radio" id="hierarchyMeaningIsA" name="hierarchyMeaning" value="is-a">
						<label for="hierarchyMeaningIsA">is-a</label>
						<input type="radio" id="hierarchyMeaningPartOf" name="hierarchyMeaning" value="part-of">
						<label for="hierarchyMeaningPartOf">part-of</label>
						<input type="radio" id="hierarchyMeaningClassifiedWith" name="hierarchyMeaning" value="classified-with">
						<label for="hierarchyMeaningClassifiedWith">classified-with</label>
						<button type="button" id="clearHierarchyMeaning">Clear</button>
					</div>
					<hr />
					<label for="compositional">compositional (if the code system defines a compositional grammar):</label>
					<div class="radiogroup">
						<input type="radio" id="compositionalTrue" name="compositional" value="true">
						<label for="compositionalTrue">true</label>
						<input type="radio" id="compositionalFalse" name="compositional" value="false">
						<label for="compositionalFalse">false</label>
						<button type="button" id="clearCompositional">Clear</button>
					</div>
					<hr />
					<label for="versionNeeded">versionNeeded (if definitions are not stable):</label>
					<div class="radiogroup">
						<input type="radio" id="versionNeededTrue" name="versionNeeded" value="true">
						<label for="versionNeededTrue">true</label>
						<input type="radio" id="versionNeededFalse" name="versionNeeded" value="false">
						<label for="versionNeededFalse">false</label>
						<button type="button" id="clearVersionNeeded">Clear</button>
					</div>
					<hr />
					<label for="supplements">supplements (canonical URL of Code System this adds designations and properties to):</label><br />
					<input type="text" id="supplements" name="supplements" size="100" /><br />
					<hr />
					<!-- TODO: regexp -->
					<label for="count">count (total concepts in the code system):</label><br />
					<input type="text" id="count" name="count" size="5" /><br />
					<hr />
				</div>
				<div id="valueSetDiv" style="display: none">
					<label for="immutable">immutable (indicates whether or not any change to the content logical definition may occur):</label>
					<div class="radiogroup">
						<input type="radio" id="immutableTrue" name="immutable" value="true">
						<label for="immutableTrue">true</label>
						<input type="radio" id="immutableFalse" name="immutable" value="false">
						<label for="immutableFalse">false</label>
						<button type="button" id="clearImmutable">Clear</button>
					</div>
					<hr />
				</div>
				<div>
					<p id='test'>aaa</p>
				</div>
				<button type="button" id="generate" value="Generate">
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
		</html>`;
	}
}

// The nonce generator.
function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}

	return text;
}
