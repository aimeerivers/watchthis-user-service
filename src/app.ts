import express from 'express';
const app = express();

app.get('/', (_req, res) => {
  res.send('Hello World!');
});

app.post('/andre', (_req, res) => {
  res.send('potato')
})

app.get('/hello/:name', (req, res) => {
  res.send(`Hello ${req.params.name}!`);
});

export { app };
