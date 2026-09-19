const button = document.getElementById('action-btn');
const message = document.getElementById('message');

button.addEventListener('click', () => {
  message.textContent = 'Setup confirmed! Your team can now view this dynamic feature.';
});
