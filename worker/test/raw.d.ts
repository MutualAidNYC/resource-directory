// Vite's ?raw imports: a file's text (test/routes.test.ts).
declare module '*?raw' {
    const text: string;
    export default text;
}
