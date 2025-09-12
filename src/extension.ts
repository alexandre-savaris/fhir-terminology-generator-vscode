// The module 'vscode' contains the VS Code extensibility API.
// Import the module and reference it with the alias vscode in your code below.
import * as vscode from 'vscode';
// For CSV to JSON conversion.
import csvConv from 'csvtojson';
// For template reading.
import * as fs from 'fs';
// For rendering templates.
import Mustache from 'mustache';
// For validating JSON content using schemas.
import Ajv from 'ajv';
// For generating FSH.
import { gofshClient } from 'gofsh';

// This method is called when your extension is activated.
// Your extension is activated the very first time the command is executed.
export function activate(context: vscode.ExtensionContext) {

	context.subscriptions.push(
		vscode.commands.registerCommand('fhir-terminology-generator-vscode.start', () => {

			// If there is an active text editor, use it.
			const activeTextEditor = vscode.window.activeTextEditor;
			if (activeTextEditor) {

				// Retrieve content from the active text editor.
				const documentText = activeTextEditor.document.getText();

				// Parse the (expected) CSV content from the opened document.
				// Each line will be converted to a JSON object structured as follows:
				let concepts: { code: string, display: string }[] = [];

				// Forcing synchronous execution.
				(async () => {
					// CSV parsing.
					await csvConv({ delimiter: 'auto', ignoreEmpty: true, headers: ['code', 'display'] })
							.fromString(documentText)
							.on('data', (data) => {
								const jsonObj = JSON.parse(data.toString());
								concepts.push(jsonObj);
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
									vscode.window.setStatusBarMessage(
										`Retrieved ${concepts.length} concepts from the CSV file.`);
									FhirTerminologyGeneratorPanel.createOrShow(
										context.extensionUri, JSON.stringify(concepts, null, 4));
									}
							});
				})();
			} else {
				vscode.window.showErrorMessage('A valid CSV document must be opened to use the extension.');
				return;
			}
		})
	);

	// Following the extension specs.
	if (vscode.window.registerWebviewPanelSerializer) {
		// Make sure we register a serializer in activation event.
		vscode.window.registerWebviewPanelSerializer(FhirTerminologyGeneratorPanel.viewType, {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
				// Reset the Webview options so we use latest uri for `localResourceRoots`.
				webviewPanel.webview.options = getWebviewOptions(context.extensionUri);
				FhirTerminologyGeneratorPanel.revive(webviewPanel, context.extensionUri);
			}
		});
	}
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
	private readonly _concepts: string;
	// Base path for resources.
	private readonly _resourceBasePath: string = 'resources';

	// Create the panel or show the current one (if it already exists).
	public static createOrShow(extensionUri: vscode.Uri, concepts: string = '') {

		// The column where the Webview panel will be shown.
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		// If we already have a panel, show it.
		if (FhirTerminologyGeneratorPanel.currentPanel) {
			FhirTerminologyGeneratorPanel.currentPanel._panel.reveal(column);
			return;
		}

		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(FhirTerminologyGeneratorPanel.viewType,
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
	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, concepts: string = '') {

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
					// The 'Generate' button was clicked.
					case 'Generate':
						// Fill a template with data from the Webview panel.
						const filledTemplate = this._fillTemplate(message.instanceType, message.text);
						// Validate the filled template using the FHIR® JSON schema.
						const { valid, errors } = this._validateFilledTemplate(filledTemplate);
						if (!valid) {
							if (errors) {
								// 'errors' is an array of objects - concat their content.
								const errorString = errors.map(function(error) {
									return error.message + ' | ';
								}).join("\n");
								vscode.window.showErrorMessage('Validation errors: ' + errorString);
							} else {
								vscode.window.showErrorMessage(
									'There was an unspecified error during the resulting JSON validation: '
										+ filledTemplate);
							}
						} else {

							// Create a new document with the terminology's instance content.
							vscode.workspace.openTextDocument({
								content: filledTemplate,
								language: 'json'
							}).then(newDocument => {
								vscode.window.showTextDocument(newDocument);
							});

							// Create a new document with the FSH content.
							gofshClient
								.fhirToFsh([filledTemplate], {
									style: "string",
									logLevel: "error",
								}).then((results) => {
									vscode.workspace.openTextDocument({
										content: results.fsh as string,
									}).then(newDocument => {
										vscode.window.showTextDocument(newDocument);
									});
								}).catch((err) => {
								vscode.window.showErrorMessage(err.message);
								vscode.window.withProgress
								});
						}
						return;
					// There were errors in matching input values with expected patterns.
					case 'inputValidationError':
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

		// Clean up resources.
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	// Update the Webview content.
	private _update() {

		// The Webview instance.
		const webview = this._panel.webview;
		// The panel's title.
		this._panel.title = 'FHIR® Terminology Generator - R5';
		// The panel's HTML content.
		this._panel.webview.html = this._getHtmlForWebview(webview);
	}

	// Fill a template with input data.
	private _fillTemplate(instanceType: string, content: string) {

		// Load the common template from disk.
		const commonTemplatePath
			= vscode.Uri.joinPath(this._extensionUri, `${this._resourceBasePath}/templates`, 'common.mustache');
		const commonTemplate = fs.readFileSync(commonTemplatePath.fsPath, { encoding: 'utf8' });

		// Load the instance type template from disk.
		const instanceTypeTemplatePath
			= vscode.Uri.joinPath(this._extensionUri, `${this._resourceBasePath}/templates`, `${instanceType}.mustache`);
		const instanceTypeTemplate = fs.readFileSync(instanceTypeTemplatePath.fsPath, { encoding: 'utf8' });

		// Fill the template with the input data.
		const filledTemplate
			= Mustache.render(instanceTypeTemplate, JSON.parse(content), { common: commonTemplate });

		return filledTemplate;
	}

	// Validate the filled template against the FHIR® JSON schema.
	private _validateFilledTemplate(filledTemplate: string) {

		// Local path to the FHIR® JSON schema.
		const fhirJsonSchemaPath
			= vscode.Uri.joinPath(this._extensionUri, `${this._resourceBasePath}/schemas`, 'fhir.schema.json');
		// Read the FHIR® JSON schema from disk.
		const fhirJsonSchema = fs.readFileSync(fhirJsonSchemaPath.fsPath, { encoding: 'utf8' });

		// Validate the filled template using the JSON schema.
		// The use of 'strict: false' is suggested in:
		// https://json-schema.org/implementations#validator-javascript.
		const ajv = new Ajv( { strict: false });
		const validate = ajv.compile(JSON.parse(fhirJsonSchema));
		const valid = validate(JSON.parse(filledTemplate));

		// Return the validation status and the validation errors (if any).
		return {
			valid,
			errors: validate.errors
		};
	}

	private _getHtmlForWebview(webview: vscode.Webview) {

		// Local path to main script run in the Webview.
		const scriptPathOnDisk
			= vscode.Uri.joinPath(this._extensionUri, `${this._resourceBasePath}/scripts`, 'script.js');
		// And the URI we use to load this script in the Webview.
		const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

		// Local path to CSS styles.
		const styleResetPath
			= vscode.Uri.joinPath(this._extensionUri, `${this._resourceBasePath}/styles`, 'reset.css');
		const stylesPathMainPath
			= vscode.Uri.joinPath(this._extensionUri, `${this._resourceBasePath}/styles`, 'vscode.css');
		const stylesCustomPath
			= vscode.Uri.joinPath(this._extensionUri, `${this._resourceBasePath}/styles`, 'custom.css');
		// URI to load styles into the Webview.
		const stylesResetUri = webview.asWebviewUri(styleResetPath);
		const stylesMainUri = webview.asWebviewUri(stylesPathMainPath);
		const stylesCustomUri = webview.asWebviewUri(stylesCustomPath);

		// Use a nonce to only allow specific scripts to be run.
		const nonce = getNonce();

		// Load the HTML content from disk.
		const htmlPath
			= vscode.Uri.joinPath(this._extensionUri, `${this._resourceBasePath}/content`, 'input.html');
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

// Return the Webview options.
function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {

	return {
		// Enable javascript in the Webview.
		enableScripts: true,
		// Restrict the Webview to only loading content from the extension's `resource` directory.
		localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources')]
	};
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


// To evaluate.
// import * as vscode from 'vscode';

// export function activate(context: vscode.ExtensionContext) {
//     let disposable = vscode.commands.registerCommand('myExtension.doSomethingLong', async () => {
//         await vscode.window.withProgress({
//             location: vscode.ProgressLocation.Notification, // or vscode.ProgressLocation.Window
//             title: "Performing a long operation...",
//             cancellable: true // Allows the user to cancel the operation
//         }, async (progress, token) => {
//             token.onCancellationRequested(() => {
//                 console.log("User canceled the long-running operation.");
//                 vscode.window.showInformationMessage("Operation canceled by user.");
//             });

//             const totalSteps = 10;
//             for (let i = 0; i < totalSteps; i++) {
//                 if (token.isCancellationRequested) {
//                     return; // Exit if canceled
//                 }

//                 // Report progress
//                 progress.report({ increment: 100 / totalSteps, message: `Step ${i + 1} of ${totalSteps}` });

//                 // Simulate a long-running task
//                 await new Promise(resolve => setTimeout(resolve, 1000));
//             }

//             vscode.window.showInformationMessage("Long operation completed!");
//         });
//     });

//     context.subscriptions.push(disposable);
// }