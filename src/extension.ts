// The module 'vscode' contains the VS Code extensibility API.
// Import the module and reference it with the alias vscode in your code below.
import * as vscode from 'vscode';

// This method is called when your extension is activated.
// Your extension is activated the very first time the command is executed.
export function activate(context: vscode.ExtensionContext) {
	// Track the current panel with a webview.
	let currentPanel: vscode.WebviewPanel | undefined = undefined;

	// Use the console to output diagnostic information (console.log) and errors (console.error).
	// This line of code will only be executed once when your extension is activated.
	console.log('Congratulations, your extension "fhir-terminology-generator-vscode" is now active!');

	context.subscriptions.push(
		vscode.commands.registerCommand('fhir-terminology-generator-vscode.start', () => {

			// ???
			const activeTextEditor = vscode.window.activeTextEditor;
			if (activeTextEditor) {
				const documentText = activeTextEditor.document.getText();
				if (isCSV(documentText)) {
					vscode.window.setStatusBarMessage('Documento CSV aberto.');
				} else {
					vscode.window.setStatusBarMessage('Documento não é um CSV.');
				}
			} else {
				vscode.window.setStatusBarMessage('Nenhum documento aberto.');
			}

			const columnToShowIn = vscode.window.activeTextEditor
				? vscode.window.activeTextEditor.viewColumn
				: undefined;
			if (currentPanel) {
				// If we already have a panel, show it in the target column.
				currentPanel.reveal(columnToShowIn);
			} else {
				// Otherwise, create a new panel.
				currentPanel = vscode.window.createWebviewPanel(
					'fhir-terminology-generator-vscode', // Identifies the type of the webview. Used internally.
					'FHIR® Terminology Generator', // Title of the panel displayed to the user.
					columnToShowIn || vscode.ViewColumn.One, // Editor column to show the new webview panel in.
					{} // Webview options.
				);
				currentPanel.webview.html = getWebviewContent();
				// Reset when the current panel is closed.
				currentPanel.onDidDispose(
					() => {
						currentPanel = undefined;
					},
					null,
					context.subscriptions
				);
			}
		})
	);
}

// This method is called when your extension is deactivated.
export function deactivate() {}

function getWebviewContent() {

	return `<!DOCTYPE html>
  <html lang="en">
  <head>
	  <meta charset="UTF-8">
	  <meta name="viewport" content="width=device-width, initial-scale=1.0">
	  <title>Cat Coding</title>
  </head>
  <body>
      <p>Status of the terminology</p>
	  <input type="radio" id="status_draft" name="status_draft" value="draft">
	  <label for="status_draft">draft</label><br>
	  <input type="radio" id="status_active" name="status_active" value="active">
	  <label for="status_active">active</label><br>
	  <input type="radio" id="status_retired" name="status_retired" value="retired">
	  <label for="status_retired">retired</label><br>
	  <input type="radio" id="status_unknown" name="status_unknown" value="unknown">
	  <label for="status_unknown">unknown</label>
  </body>
  </html>`;
  }

function isCSV(text: string) {

	const csvRegex = /^(\s*(?:[-\w.,$]+)\s*(?:,|\t|;)*){2,}$/;
	return csvRegex.test(text);
}
