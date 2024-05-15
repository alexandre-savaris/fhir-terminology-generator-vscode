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

			// Parse the CSV content from the opened document (if any).
			const activeTextEditor = vscode.window.activeTextEditor;
			if (activeTextEditor) {
				const documentText = activeTextEditor.document.getText();

				const stream = csv.parse({ delimiter: ';', headers: true })
					.on('error', error => { vscode.window.setStatusBarMessage(error.message); return; })
					.on('data', row => vscode.window.setStatusBarMessage(row))
					.on('end', (rowCount: number) => vscode.window.setStatusBarMessage(`Parsed ${rowCount} rows.`));
				stream.write(documentText);
				stream.end();
			} else {
				vscode.window.setStatusBarMessage('A valid CSV document must be opened to use the extension.');
				return;
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

				// Load the HTML into the webview.
				currentPanel.webview.html = getWebviewContent(context);

				// Handle messages from the webview.
				currentPanel.webview.onDidReceiveMessage(
					message => {
						switch (message.command) {
							case 'formData':
								vscode.window.setStatusBarMessage(message.text);
								return;
							}
					},
					undefined,
					context.subscriptions
				);				

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
				#fhirTerminologyForm {
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
			<h1>FHIR® Terminology Generator - R5</h1>
			<form id="fhirTerminologyForm">
				<label for="terminologyInstance">Terminology instance type:</label>
				<div class="radiogroup">
					<input type="radio" id="codesystem" name="terminologyInstance" value="CodeSystem" checked>
					<label for="codesystem">CodeSystem</label>
					<input type="radio" id="valueset" name="terminologyInstance" value="ValueSet">
					<label for="valueset">ValueSet</label>
				</div>
				<hr />
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
				<div class="radiogroup">
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
				<div id="codesystemDiv">
					<label for="content">content (the extent of the content of the instance):</label>
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
					<label for="canonicalvalueset">valueSet (canonical reference to the value set with entire code system):</label><br />
					<input type="text" id="canonicalvalueset" name="canonicalvalueset" size="100" /><br />
					<hr />
				</div>








				<div>
					<p id='test'>aaa</p>
				</div>
				<button type="button" id="clearButton">Limpar</button>
				<input type="button" value="Send" onclick="send();">
			</form>
			<!--
			<script src="script.js"></script>
			-->
			<script>

				// ???
				const codesystemRadiobutton = document.getElementById('codesystem');
				codesystemRadiobutton.addEventListener('click', () => {
					document.getElementById('codesystemDiv').style.display = "block";
					//document.getElementById('valuesetDiv').style.display = "none";
				}

				// ???
				const valuesetRadiobutton = document.getElementById('valueset');
				valuesetRadiobutton.addEventListener('click', () => {
					document.getElementById('codesystemDiv').style.display = "none";
					//document.getElementById('valuesetDiv').style.display = "block";
				}

				// Clear the selection for the 'experimental' radiogroup.
				const clearExperimentalButton = document.getElementById('clearExperimental');
				clearExperimentalButton.addEventListener('click', () => {
					const radioButtons = document.getElementsByName('experimental');
					clearRadiobuttons(radioButtons);
				});

				// Clear the selection for the 'caseSensitive' radiogroup.
				const clearCaseSensitiveButton = document.getElementById('clearCaseSensitive');
				clearCaseSensitiveButton.addEventListener('click', () => {
					const radioButtons = document.getElementsByName('caseSensitive');
					clearRadiobuttons(radioButtons);
				});

				// Clear the selection for a list of radiobuttons.
				function clearRadiobuttons(radiobuttons) {

					for (const radioButton of radiobuttons) {
						radioButton.checked = false;
					}
				}
				





				const clearButton = document.getElementById('clearButton');
				const submitButton = document.getElementById('submitButton');
				const fhirTerminologyForm = document.getElementById('fhirTerminologyForm');
	
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

				// ???
				function send() {
					const vscode = acquireVsCodeApi();

					let form = document.getElementById("fhirTerminologyForm");
					let formData = {};
					for (let i = 0; i < form.elements.length; i++) {
						let element = form.elements[i];
						//if (element.type !== "submit") {
							formData[element.name] = element.value;
						//}
					}
					let jsonData = JSON.stringify(formData);
					const test = document.getElementById("test");
					test.innerHTML = jsonData; 

					vscode.postMessage({
                        command: 'formData',
                        text: jsonData
                    })
				}
			</script>
		</body>
	</html>	`;
}
