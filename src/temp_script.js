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

  alert(`Status selecionado: ${selectedRadio.value}`);
});
