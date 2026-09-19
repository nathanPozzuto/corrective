const button = document.getElementById('action-btn');
const message = document.getElementById('message');

//This sends a request to your Java backend, then either logs and displays the result, or logs an error if something goes wrong. Use .text() since your health endpoint currently returns a plain string ('ok'), not JSON — you'd use .json() instead if your endpoint returns a JSON object.
fetch('http://localhost:8080/api/health') .then(response => response.text()) .then(data => { console.log('Backend said:', data); document.body.innerHTML += `<p>Backend response: ${data}</p>`; }) .catch(error => console.error('Error:', error)); 

button.addEventListener('click', () => {
  message.textContent = 'Setup confirmed! Your team can now view this dynamic feature.';
});
