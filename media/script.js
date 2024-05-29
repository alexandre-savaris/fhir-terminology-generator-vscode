(function() {

	// Handle messages received from the extension.
	window.addEventListener('message', event => {
		const message = event.data; // The JSON data our extension sent.
		switch (message.command) {
			case 'concepts':
				document.getElementById("concepts").value = message.text;
				break;
		}
	});

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
		setTextualInputValues(valueSetDiv, previousState);
		setRadioGroupValues(valueSetDiv, previousState);

		// CSV and JSON content div.
		setTextualInputValues(conceptsDiv, previousState);

	} else {

		// Reinforce the HTML state to be shown.
		document.getElementById('codeSystem').checked = "true";
		document.getElementById('codeSystemDiv').style.display = "block";
		document.getElementById('valueSetDiv').style.display = "none";
		
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




		// Validate fields with filling patterns.
		const element = document.getElementById('date');
		const test2 = document.getElementById("test");
		if (element.value.trim().length > 0) {
			test2.innerHTML = 'YYY';
			//const re = new RegExp("([0-9]([0-9]([0-9][1-9]|[1-9]0)|[1-9]00)|[1-9]000)(-(0[1-9]|1[0-2])(-(0[1-9]|[1-2][0-9]|3[0-1])(T([01][0-9]|2[0-3]):[0-5][0-9]:([0-5][0-9]|60)(\\.[0-9]{1,9})?)?)?(Z|(\\+|-)((0[0-9]|1[0-3]):[0-5][0-9]|14:00)?)?)?");
			const re = new RegExp(element.pattern);
			test2.innerHTML = 'YYY';
			if (!re.test(element.value.trim())) {
				test2.innerHTML = 'ZZZ';
				return;
			}
		}



		// The object to be filled with the input data.
		let inputData = {};

		// //////////////////////////////
		// Retrieve values from elements.
		// //////////////////////////////

		inputData['terminologyInstance'] = document.querySelector('input[name="terminologyInstance"]:checked').value;

		// Common div.
		getTextualInputValues(commonDiv, inputData);
		getRadioGroupValues(commonDiv, inputData);

		// CSV and JSON content div.
		getTextualInputValues(conceptsDiv, inputData);

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
		vscode.postMessage({
			command: document.querySelector('input[name="terminologyInstance"]:checked').value,
			text: jsonData
		});

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
