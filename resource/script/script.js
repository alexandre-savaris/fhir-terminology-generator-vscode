(function() {

	// Access point to the VSCode API.
	const vscode = acquireVsCodeApi();

	// Handle messages received from the extension.
	window.addEventListener('message', event => {
		const message = event.data; // The JSON data our extension sent.
		switch (message.command) {
			// Show the concepts extracted from the CSV input file.
			case 'concepts':
				document.getElementById('concepts').value = message.text;
				break;
		}
	});

	// Is there a previous state to be used?
	const previousState = vscode.getState();
	if (previousState) {

		// /////////////////////////////////////////////////
		// Restore the HTML content from the previous state.
		// /////////////////////////////////////////////////

		// Terminology instance type.
		if (previousState.terminologyInstance === 'CodeSystem') {
			document.getElementById('codeSystem').checked = 'true';
			document.getElementById('codeSystemDiv').style.display = 'block';
			document.getElementById('valueSetDiv').style.display = 'none';
		} else if (previousState.terminologyInstance === 'ValueSet') {
			document.getElementById('valueSet').checked = 'true';
			document.getElementById('codeSystemDiv').style.display = 'none';
			document.getElementById('valueSetDiv').style.display = 'block';
		}

		// Common div.
		setTextualInputValues(commonDiv, previousState);
		setRadioGroupValues(commonDiv, previousState);

		// CodeSystem div.
		setTextualInputValues(codeSystemDiv, previousState);
		setRadioGroupValues(codeSystemDiv, previousState);

		// ValueSet div.
		setTextualInputValues(valueSetDiv, previousState);
		setRadioGroupValues(valueSetDiv, previousState);

		// Concepts div.
		setTextualInputValues(conceptsDiv, previousState);

	} else {

		// Reinforce the HTML state to be shown.
		document.getElementById('codeSystem').checked = 'true';
		document.getElementById('codeSystemDiv').style.display = 'block';
		document.getElementById('valueSetDiv').style.display = 'none';
		
	}

	// Show/hide elements according to the selection.
	const codeSystemRadioButton = document.getElementById('codeSystem');
	codeSystemRadioButton.addEventListener('click', () => {
		document.getElementById('codeSystemDiv').style.display = 'block';
		document.getElementById('valueSetDiv').style.display = 'none';
	});

	// Show/hide elements according to the selection.
	const valueSetRadioButton = document.getElementById('valueSet');
	valueSetRadioButton.addEventListener('click', () => {
		document.getElementById('codeSystemDiv').style.display = 'none';
		document.getElementById('valueSetDiv').style.display = 'block';
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

		// Validate the inputs against their patterns and set the Webview's current state.
		const inputValidationError = setCurrentState(vscode, inputData);

		if (!inputValidationError) {

			let jsonData = JSON.stringify(inputData);
	
			// Send the input data to the extension.
			vscode.postMessage({
				command: 'Generate',
				instanceType: document.querySelector('input[name="terminologyInstance"]:checked').value,
				text: jsonData
			});

		}

	});

}());

// Get textual input values.
function getTextualInputValues(div, inputData, generateButtonWasClicked = true) {

	// Loop on the div's child nodes.
	for (let i = 0; i < div.childNodes.length; i++) {
		let element = div.childNodes[i];
		if (element.type === 'text' || element.type === 'textarea') {
			const elementValue = element.value.trim();
			if (elementValue.length > 0) {
				// If the 'Generate' button was clicked, Validate the element's content against its pattern (if available).
				if (generateButtonWasClicked && element.pattern) {
					const re = new RegExp(element.pattern);
					const replaced = elementValue.replace(re, '');
					// If the resulting string after replacement has some content, the full matching has failed.
					if (replaced.length > 0) {
						return `The value for the element '${element.name}' doesn't match the expected format. See the official HL7® FHIR® documentation for clarifications.`;
					}
				}
				inputData[element.id] = elementValue;
			}
		}
	}

	return null;
}

// Set textual input values.
function setTextualInputValues(div, previousState) {

	for (let i = 0; i < div.childNodes.length; i++) {
		let element = div.childNodes[i];
		if (element.type === 'text' || element.type === 'textarea') {
			element.value = previousState[element.id] ? previousState[element.id] : null;
		}
	}
}

// Get radiogroup values.
function getRadioGroupValues(div, inputData) {

	for (let i = 0; i < div.childNodes.length; i++) {
		let element = div.childNodes[i];
		if (element.className === 'radiogroup') {
			getCheckedRadioButton(element, inputData);
		}
	}
}

// Set radiogroup values.
function setRadioGroupValues(div, previousState) {

	for (let i = 0; i < div.childNodes.length; i++) {
		let element = div.childNodes[i];
		if (element.className === 'radiogroup') {
			setRadioButtonAsChecked(element, previousState);
		}
	}
}

// Get checked radiobutton.
function getCheckedRadioButton(radioGroupDiv, inputData) {

	for (let i = 0; i < radioGroupDiv.childNodes.length; i++) {
		let element = radioGroupDiv.childNodes[i];
		if (element.type === 'radio' && element.checked) {
			inputData[element.name] = element.value;
			break;
		}
	}
}

// Set radiobutton as checked.
function setRadioButtonAsChecked(div, previousState) {

	for (let i = 0; i < div.childNodes.length; i++) {
		let element = div.childNodes[i];
		if (element.type === 'radio' && previousState[element.name] === element.value) {
			element.checked = 'true';
			break;
		}
	}
}

// Uncheck all radiobuttons of a radiogroup.
function uncheckRadioButtons(elementName) {

	const radioButtons = document.getElementsByName(elementName);
	for (const radioButton of radioButtons) {
		radioButton.checked = false;
	}
}

// Set the Webview's current state for (possible) later use.
function setCurrentState(vscode, inputData, generateButtonWasClicked = true) {

	// //////////////////////////////
	// Retrieve values from elements.
	// //////////////////////////////
	
	inputData['terminologyInstance'] = document.querySelector('input[name="terminologyInstance"]:checked').value;
	
	let inputValidationError = null;
	
	// Common div.
	inputValidationError = getTextualInputValues(commonDiv, inputData, generateButtonWasClicked);
	if (inputValidationError) {
		vscode.postMessage({
			command: 'inputValidationError',
			text: inputValidationError
		});
		return inputValidationError;
	}
	getRadioGroupValues(commonDiv, inputData);
	
	// Concepts div.
	inputValidationError = getTextualInputValues(conceptsDiv, inputData, generateButtonWasClicked);
	if (inputValidationError) {
		vscode.postMessage({
			command: 'inputValidationError',
			text: inputValidationError
		});
		return inputValidationError;
	}
	
	if (document.getElementById('codeSystem').checked) {  // CodeSystem div.
		inputValidationError = getTextualInputValues(codeSystemDiv, inputData, generateButtonWasClicked);
		if (inputValidationError) {
			vscode.postMessage({
				command: 'inputValidationError',
				text: inputValidationError
			});
			return inputValidationError;
		}
		getRadioGroupValues(codeSystemDiv, inputData);
	} else {  // ValueSet div.
		inputValidationError = getTextualInputValues(valueSetDiv, inputData, generateButtonWasClicked);
		if (inputValidationError) {
			vscode.postMessage({
				command: 'inputValidationError',
				text: inputValidationError
			});
			return inputValidationError;
		}
		getRadioGroupValues(valueSetDiv, inputData);
	}
	
	// Count the number of concepts.
	inputData['counts'] = JSON.parse(inputData.concepts).length;
	
	// Persist the input data as the current state.
	vscode.setState(inputData);

	return null;
}
