# fhir-terminology-generator-vscode
A minimalistic VS Code extension to generate FHIR® terminology-related structures.  

It's minimalistic because:
1. It generates only __CodeSystem__ or __ValueSet__ instances;
2. the source CSV files must have only 2 columns - the first one with __codes__ (text symbols that uniquely identify concepts within the terminology), and the second one with __display texts__ (human-readable strings related to codes);
3. it considers only attributes with a __maximum cardinality of 1__, represented by __simple datatypes__ (e.g. string, boolean, etc.);
4. the output is generated exclusively in __JSON__ and in __FSH__ format.

FHIR Specification = v5.0.0: R5 - STU

## Usage
1. Open up a CSV file with 2 columns - the first one with codes and the second one with texts related to the codes;
2. Open up the extension by using the Command Palette ("View/Command Palette..." or Ctrl+Shift+P) by selecting the option "Start a new FHIR® Terminology Generator session";
3. Fill in the values for the terminology instance;
4. Generate the terminology instance by clicking the "Generate" button.

![Extension usage](resources/images/extension_usage.gif)

## Notes
The file [fhir.schema.json](resources/schemas/fhir.schema.json) (FHIR® JSON Schema) was modified to be used in the validation, as follows:
1. As recommended in https://ajv.js.org/guide/schema-language.html, the key $schema was removed;
2. "{1,9}}" was replaced by "{1,9}" due to syntax issues.

## Known Issues
The state (i.e. the values filled in the extension fields) are saved internally by the extension whenever the button "Generate" is clicked. If you change the editor tab without clicking the button, the values informed since the last click on the same button will be lost.

## Release Notes

### 1.1.0

- Added generation of FSH content.

### 1.0.0

- Initial release.
