// The module 'vscode' contains the VS Code extensibility API.
// Import the module and reference it with the alias vscode in your code below.
import * as vscode from 'vscode';
import * as csv from '@fast-csv/parse';
//import * as fs from 'fs';
//import * as path from 'path';

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

				const stream = csv.parse({ delimiter: ';', headers: true })
					.on('error', error => vscode.window.setStatusBarMessage(error.message))
					.on('data', row => vscode.window.setStatusBarMessage(row))
					.on('end', (rowCount: number) => vscode.window.setStatusBarMessage(`Parsed ${rowCount} rows`));
				stream.write(documentText);
				stream.end();
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
					{
						// Only allow the webview to access resources in the 'src' directory.
						localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'src')],
						// Enable script execution.
						enableScripts: true
					} // Webview options.
				);

				currentPanel.webview.html = getWebviewContent(context);
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

function getWebviewContent(context: vscode.ExtensionContext) {
/*
	let html = '';

	fs.readFile(path.join(context.extensionPath, 'src', 'temp_form.html'), (err, data) => {
		if(err) {
			console.error(err);
		}
		html = data.toString();
	});

	return html;
*/

	return `<!DOCTYPE html>
	<html>
		<head>
			<title>Formulário de Entrada de Dados</title>
			<!--
			<link rel="stylesheet" type="text/css" href="style.css">
			-->
			<style>
				body {
					font-family: sans-serif;
				}
				/*
				#formulario {
					display: flex;
					flex-direction: column;
					align-items: center;
					width: 300px;
					margin: 0 auto;
					padding: 20px;
					border: 1px solid #ccc;
					border-radius: 5px;
				}
				
				.radiogroup {
					display: flex;
					flex-direction: row;
					margin-bottom: 15px;
				}
				
				.radiogroup input[type="radio"] {
					margin-right: 5px;
				}
				
				.radiogroup label {
					margin-right: 20px;
				}
				
				#clearButton, #submitButton {
					padding: 10px 20px;
					background-color: #4CAF50;
					color: white;
					border: none;
					border-radius: 5px;
					cursor: pointer;
					margin-top: 10px;
				}
				*/
				#submitButton {
					background-color: #3e8e41;
				}
			</style>
		</head>
		<body>
			<h1>FHIR® Terminology Generator</h1>
			<form id="formulario">
				<label for="fhirRelease">FHIR® release:</label>
				<div class="radiogroup">
					<input type="radio" id="r4" name="fhirRelease" value="R4" checked>
					<label for="r4">R4</label>
					<input type="radio" id="r5" name="fhirRelease" value="R5">
					<label for="r5">R5</label>
				</div>
				<label for="terminologyInstance">Terminology instance type:</label>
				<div class="radiogroup">
					<input type="radio" id="codesystem" name="terminologyInstance" value="CodeSystem" checked>
					<label for="codesystem">CodeSystem</label>
					<input type="radio" id="valueset" name="terminologyInstance" value="ValueSet">
					<label for="valueset">ValueSet</label>
				</div>
				<label for="status">Status:</label>
				<div class="radiogroup">
					<input type="radio" id="draft" name="status" value="draft" checked>
					<label for="draft">Draft</label>
					<input type="radio" id="active" name="status" value="active">
					<label for="active">Active</label>
					<input type="radio" id="retired" name="status" value="retired">
					<label for="retired">Retired</label>
					<input type="radio" id="unknown" name="status" value="unknown">
					<label for="unknown">Unknown</label>
				</div>
				<button type="button" id="clearButton">Limpar</button>
				<button type="submit" id="submitButton">Enviar</button>
			</form>
			<!--
			<script src="script.js"></script>
			-->
			<script>
				const clearButton = document.getElementById('clearButton');
				const submitButton = document.getElementById('submitButton');
				const formulario = document.getElementById('formulario');
	
				clearButton.addEventListener('click', () => {
				const radios = document.querySelectorAll('.radiogroup input[type="radio"]');
				for (const radio of radios) {
					radio.checked = false;
				}
				});
	
				submitButton.addEventListener('click', (event) => {
				event.preventDefault();
	
				const selectedRadio = document.querySelector('.radiogroup input[type="radio"]:checked');
				if (!selectedRadio) {
					alert('Selecione um status!');
					return;
				}
				});
			</script>
		</body>
	</html>	`;
}
