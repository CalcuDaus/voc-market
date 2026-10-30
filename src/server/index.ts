import { createApp } from './app';

const port = Number(process.env.PORT || 3000);
const app = createApp();

app.listen(port);
console.log(`VOC-Market ElysiaJS server running at http://localhost:${port}`);

