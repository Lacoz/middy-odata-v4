let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', async () => {
  try {
    const module = await import('./index.mjs');
    const event = JSON.parse(input);
    const result = await module.handler(event);
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error('Error:', error.message);
  }
});
