// Show/hide elements according to the selection.
const codeSystemRadioButton = document.getElementById('codeSystem');
codeSystemRadioButton.addEventListener('click', () => {
    document.getElementById('codeSystemDiv').style.display = "block";
	document.getElementById('valueSetDiv').style.display = "none";
});

// Show/hide elements according to the selection.
const valueSetRadioButton = document.getElementById('valueSet');
valueSetRadioButton.addEventListener('click', () => {
	document.getElementById('codeSystemDiv').style.display = "none";
	document.getElementById('valueSetDiv').style.display = "block";
});

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

// Clear the selection for the 'hierarchyMeaning' radiogroup.
const clearHierarchyMeaningButton = document.getElementById('clearHierarchyMeaning');
clearHierarchyMeaningButton.addEventListener('click', () => {
	const radioButtons = document.getElementsByName('hierarchyMeaning');
	clearRadiobuttons(radioButtons);
});

// Clear the selection for the 'hierarchyMeaning' radiogroup.
const clearCompositionalButton = document.getElementById('clearCompositional');
clearCompositionalButton.addEventListener('click', () => {
	const radioButtons = document.getElementsByName('compositional');
	clearRadiobuttons(radioButtons);
});

// Clear the selection for the 'versionNeeded' radiogroup.
const clearVersionNeededButton = document.getElementById('clearVersionNeeded');
clearVersionNeededButton.addEventListener('click', () => {
	const radioButtons = document.getElementsByName('versionNeeded');
	clearRadiobuttons(radioButtons);
});

// Clear the selection for the 'versionNeeded' radiogroup.
const clearImmutableButton = document.getElementById('clearImmutable');
clearImmutableButton.addEventListener('click', () => {
	const radioButtons = document.getElementsByName('immutable');
	clearRadiobuttons(radioButtons);
});

// Generate a JSON object with the input values and send it to the extension.
const generateButton = document.getElementById('generate');
generateButton.addEventListener('click', () => {
	generate();
});

// Clear the selection for a list of radiobuttons.
function clearRadiobuttons(radioButtons) {

	for (const radioButton of radioButtons) {
		radioButton.checked = false;
	}
}

// Generate a JSON object with the input values and send it to the extension.
function generate() {
	// Access point to the VSCode API.
	const vscode = acquireVsCodeApi();
	// The object to be filled with the input data.
	let inputData = {};

	// Retrieve values from elements.
    inputData['terminologyInstance'] = document.querySelector('input[name="terminologyInstance"]:checked').value;
    // Common div.
    retrieveTextualInputs(commonDiv, inputData);
    inputData['status'] = document.querySelector('input[name="status"]:checked').value;
    if (document.querySelector('input[name="experimental"]:checked') !== null) {
        inputData['experimental'] = document.querySelector('input[name="experimental"]:checked').value;
    }
    if (document.getElementById('codeSystem').checked) {  // CodeSystem div.
        retrieveTextualInputs(codeSystemDiv, inputData);
        inputData['content'] = document.querySelector('input[name="content"]:checked').value;
        if (document.querySelector('input[name="caseSensitive"]:checked') !== null) {
            inputData['caseSensitive'] = document.querySelector('input[name="caseSensitive"]:checked').value;
        }
        if (document.querySelector('input[name="hierarchyMeaning"]:checked') !== null) {
            inputData['hierarchyMeaning'] = document.querySelector('input[name="hierarchyMeaning"]:checked').value;
        }
        if (document.querySelector('input[name="compositional"]:checked') !== null) {
            inputData['compositional'] = document.querySelector('input[name="compositional"]:checked').value;
        }
        if (document.querySelector('input[name="versionNeeded"]:checked') !== null) {
            inputData['versionNeeded'] = document.querySelector('input[name="versionNeeded"]:checked').value;
        }
    } else {  // ValueSet div.
        retrieveTextualInputs(valueSetDiv, inputData);
        if (document.querySelector('input[name="immutable"]:checked') !== null) {
            inputData['immutable'] = document.querySelector('input[name="immutable"]:checked').value;
        }
    }

	let jsonData = JSON.stringify(inputData);
	const test = document.getElementById("test");
	test.innerHTML = jsonData;

	// Persist the input data for (possible) later use.
	vscode.setState(jsonData);

	// Send the input data to the extension.
	vscode.postMessage({
        command: document.querySelector('input[name="terminologyInstance"]:checked').value,
        text: jsonData
    });
}

// Retrieve values from textual inputs.
function retrieveTextualInputs(div, inputData) {

	// Loop on the div's child nodes.
	for (let i = 0; i < div.childNodes.length; i++) {
		let element = div.childNodes[i];
		if (element.type === "text" || element.type === "textarea") {
			if (element.value.trim().length > 0) {
				inputData[element.name] = element.value;
			}
		}
	}
}
