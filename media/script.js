(function() {

	// Access point to the VSCode API.
	const vscode = acquireVsCodeApi();

	// Is there a previous state to be used?
	const previousState = vscode.getState();
	if (previousState) {

		// TODO: debug.
		const test = document.getElementById("test");
		test.innerHTML = JSON.stringify(previousState);

		// /////////////////////////////////////////////////
		// Restore the HTML content from the previous state.
		// /////////////////////////////////////////////////

		// Terminology instance type.
		if (previousState.terminologyInstance === "CodeSystem") {
			document.getElementById('codeSystem').checked = "true";
			document.getElementById('codeSystemDiv').style.display = "block";
			document.getElementById('valueSetDiv').style.display = "none";
		} else if (previousState.terminologyInstance === "ValueSet") {
			document.getElementById('valueSet').checked = "true";
			document.getElementById('codeSystemDiv').style.display = "none";
			document.getElementById('valueSetDiv').style.display = "block";
		}

		// Common div.
		setTextualInputValues(commonDiv, previousState);
		setRadioGroupValues(commonDiv, previousState);

		// CodeSystem div.
		setTextualInputValues(codeSystemDiv, previousState);
		setRadioGroupValues(codeSystemDiv, previousState);

		// ValueSet div.
		setRadioGroupValues(valueSetDiv, previousState);

	}

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
		uncheckRadioButtons('experimental');
	});

	// Clear the selection for the 'caseSensitive' radiogroup.
	const clearCaseSensitiveButton = document.getElementById('clearCaseSensitive');
	clearCaseSensitiveButton.addEventListener('click', () => {
		uncheckRadioButtons('caseSensitive');
	});

	// Clear the selection for the 'hierarchyMeaning' radiogroup.
	const clearHierarchyMeaningButton = document.getElementById('clearHierarchyMeaning');
	clearHierarchyMeaningButton.addEventListener('click', () => {
		uncheckRadioButtons('hierarchyMeaning');
	});

	// Clear the selection for the 'compositional' radiogroup.
	const clearCompositionalButton = document.getElementById('clearCompositional');
	clearCompositionalButton.addEventListener('click', () => {
		uncheckRadioButtons('compositional');
	});

	// Clear the selection for the 'versionNeeded' radiogroup.
	const clearVersionNeededButton = document.getElementById('clearVersionNeeded');
	clearVersionNeededButton.addEventListener('click', () => {
		uncheckRadioButtons('versionNeeded');
	});

	// Clear the selection for the 'immutable' radiogroup.
	const clearImmutableButton = document.getElementById('clearImmutable');
	clearImmutableButton.addEventListener('click', () => {
		uncheckRadioButtons('immutable');
	});

	// Generate a JSON object with the input values and send it to the extension.
	const generateButton = document.getElementById('generate');
	generateButton.addEventListener('click', () => {

		// The object to be filled with the input data.
		let inputData = {};

		// //////////////////////////////
		// Retrieve values from elements.
		// //////////////////////////////

		inputData['terminologyInstance'] = document.querySelector('input[name="terminologyInstance"]:checked').value;

		// Common div.
		getTextualInputValues(commonDiv, inputData);
		getRadioGroupValues(commonDiv, inputData);

		if (document.getElementById('codeSystem').checked) {  // CodeSystem div.
			getTextualInputValues(codeSystemDiv, inputData);
			getRadioGroupValues(codeSystemDiv, inputData);
		} else {  // ValueSet div.
			getTextualInputValues(valueSetDiv, inputData);
			getRadioGroupValues(valueSetDiv, inputData);
		}

		// Persist the input data for (possible) later use.
		vscode.setState(inputData);

		// TODO: debug.
		let jsonData = JSON.stringify(inputData);
		const test = document.getElementById("test");
		test.innerHTML = jsonData;

		// Send the input data to the extension.
		//vscode.postMessage({
		//	command: document.querySelector('input[name="terminologyInstance"]:checked').value,
		//	text: jsonData
		//});

	});

}());

// Get textual input values.
function getTextualInputValues(div, inputData) {

	// Get textual input values - loop on the div's child nodes.
	for (let i = 0; i < div.childNodes.length; i++) {
		let element = div.childNodes[i];
		if (element.type === "text" || element.type === "textarea") {
			if (element.value.trim().length > 0) {
				inputData[element.id] = element.value;
			}
		}
	}
}

// Set textual input values.
function setTextualInputValues(div, previousState) {

	for (let i = 0; i < div.childNodes.length; i++) {
		let element = div.childNodes[i];
		if (element.type === "text" || element.type === "textarea") {
			element.value = previousState[element.id] ? previousState[element.id] : null;
		}
	}
}

// Get radiogroup values.
function getRadioGroupValues(div, inputData) {

	for (let i = 0; i < div.childNodes.length; i++) {
		let element = div.childNodes[i];
		if (element.className === "radiogroup") {
			getCheckedRadioButton(element, inputData);
		}
	}
}

// Set radiogroup values.
function setRadioGroupValues(div, previousState) {

	for (let i = 0; i < div.childNodes.length; i++) {
		let element = div.childNodes[i];
		if (element.className === "radiogroup") {
			setRadioButtonAsChecked(element, previousState);
		}
	}
}

// Get checked radiobutton.
function getCheckedRadioButton(radioGroupDiv, inputData) {

	for (let i = 0; i < radioGroupDiv.childNodes.length; i++) {
		let element = radioGroupDiv.childNodes[i];
		if (element.type === "radio" && element.checked) {
			inputData[element.name] = element.value;
			break;
		}
	}
}

// Set radiobutton as checked.
function setRadioButtonAsChecked(div, previousState) {

	for (let i = 0; i < div.childNodes.length; i++) {
		let element = div.childNodes[i];
		if (element.type === "radio" && previousState[element.name] === element.value) {
			element.checked = "true";
			break;
		}
	}
}

// Uncheck radiobuttons of a radiogroup.
function uncheckRadioButtons(elementName) {

	const radioButtons = document.getElementsByName(elementName);
	for (const radioButton of radioButtons) {
		radioButton.checked = false;
	}
}
