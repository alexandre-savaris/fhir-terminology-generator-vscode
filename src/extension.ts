// The module 'vscode' contains the VS Code extensibility API.
// Import the module and reference it with the alias vscode in your code below.
import * as vscode from 'vscode';
// For CSV to JSON conversion.
import csvConv from 'csvtojson';
// For rendering templates.
import Mustache from 'mustache';
// For template reading.
import * as fs from 'fs';

// This method is called when your extension is activated.
// Your extension is activated the very first time the command is executed.
export function activate(context: vscode.ExtensionContext) {

	context.subscriptions.push(
		vscode.commands.registerCommand('fhir-terminology-generator-vscode.start', () => {

			// Parse the CSV content from the opened document (if any).
			const activeTextEditor = vscode.window.activeTextEditor;

			// TODO: comments.
			if (activeTextEditor) {

				const documentText = activeTextEditor.document.getText();

				// TODO: comments.
				let concepts: { code: string, display: string }[] = [];
				(async () => {
					await csvConv({ delimiter: 'auto', ignoreEmpty: true, headers: ["code", "display"] })
							.fromString(documentText)
							.on('data', (data) => {
								const jsonObj = JSON.parse(data.toString());
								concepts.push(jsonObj);
								vscode.window.setStatusBarMessage(data.toString());
							})
							.on('error', (err) => {
								vscode.window.showErrorMessage(err.message);
								return;
							})
							.on('done', (err) => {
								if (err) {
									vscode.window.showErrorMessage(err.message);
									return;
								} else {
									FhirTerminologyGeneratorPanel.createOrShow(
										context.extensionUri, JSON.stringify(concepts, null, 4));
									}
							});
				})();
			} else {
				vscode.window.setStatusBarMessage('A valid CSV document must be opened to use the extension.');
				return;
			}
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
	// Concepts extracted from the orginal CSV file.
	private readonly _concepts: String;

	// Create the panel or show the current one (if it already exists).
	public static createOrShow(extensionUri: vscode.Uri, concepts: String = '') {

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

		FhirTerminologyGeneratorPanel.currentPanel = new FhirTerminologyGeneratorPanel(
			panel, extensionUri, concepts);
	}

	// Revive a panel.
	public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {

		FhirTerminologyGeneratorPanel.currentPanel = new FhirTerminologyGeneratorPanel(
			panel, extensionUri);
	}

	// The FhirTerminologyGeneratorPanel class constructor.
	private constructor(
		panel: vscode.WebviewPanel, extensionUri: vscode.Uri, concepts: String = '') {

		this._panel = panel;
		this._extensionUri = extensionUri;
		this._concepts = concepts;

		// Set the Webview's initial HTML content.
		this._update();

		// Send the original CSV content to the Webview.
		this._panel.webview.postMessage({
			command: 'concepts',
			text: this._concepts
		});

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
						const codeSystemTemplate = this._fillCodeSystemTemplate(message.text);
						// Create a new document with the terminology's contet.
						vscode.workspace.openTextDocument({
							content: codeSystemTemplate,
							language: 'json'
						}).then(newDocument => {
							vscode.window.showTextDocument(newDocument);
						});
						return;
					case 'ValueSet':
						const valueSetTemplate = this._fillValueSetTemplate(message.text);
						// Create a new document with the terminology's contet.
						vscode.workspace.openTextDocument({
							content: valueSetTemplate,
							language: 'json'
						}).then(newDocument => {
							vscode.window.showTextDocument(newDocument);
						});
						return;
					case 'validationError':
						vscode.window.showErrorMessage(message.text);
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

	// Fill the ValueSet template with the input data.
	private _fillValueSetTemplate(content: string) {

		// Load the common template from disk.
		const commonTemplatePath = vscode.Uri.joinPath(this._extensionUri, 'media', 'common.mustache');
		const commonTemplate = fs.readFileSync(commonTemplatePath.fsPath, { encoding: 'utf8' });

		// Load the ValueSet template from disk.
		const valueSetTemplatePath = vscode.Uri.joinPath(this._extensionUri, 'media', 'ValueSet.mustache');
		const valueSetTemplate = fs.readFileSync(valueSetTemplatePath.fsPath, { encoding: 'utf8' });

		// Fill the template with the input data.
		const filledTemplate = Mustache.render(valueSetTemplate, JSON.parse(content), { common: commonTemplate });

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
		const stylesCustomPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'custom.css');
		// URI to load styles into the Webview.
		const stylesResetUri = webview.asWebviewUri(styleResetPath);
		const stylesMainUri = webview.asWebviewUri(stylesPathMainPath);
		const stylesCustomUri = webview.asWebviewUri(stylesCustomPath);
		// Use a nonce to only allow specific scripts to be run.
		const nonce = getNonce();

		// Load the HTML content from disk.
		const htmlPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'input.html');
		let html = fs.readFileSync(htmlPath.fsPath, { encoding: 'utf8' });

		// Replace the placeholders with paths and values.
		html = html.replaceAll("{%webview.cspSource%}", webview.cspSource)
			.replaceAll("{%nonce%}", nonce)
			.replaceAll("{%stylesResetUri%}", stylesResetUri.toString())
			.replaceAll("{%stylesMainUri%}", stylesMainUri.toString())
			.replaceAll("{%stylesCustomUri%}", stylesCustomUri.toString())
			.replaceAll("{%scriptUri%}", scriptUri.toString());

		return html;
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
