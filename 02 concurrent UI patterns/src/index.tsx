import {} from "react-dom/experimental";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { App } from "./app";

// ReactDOM.render(<App />, document.getElementById("root"));

const rootEl = document.getElementById('root') as HTMLElement // createRoot does not accept null values
const root = ReactDOM.createRoot(rootEl)
root.render(<App />)