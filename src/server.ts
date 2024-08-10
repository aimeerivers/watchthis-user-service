import { app } from "./app";
const port = process.env.PORT || 8583;

const server = app.listen(port, () => {
  console.log(`Express is listening at http://localhost:${port}`);
});

export { server };
