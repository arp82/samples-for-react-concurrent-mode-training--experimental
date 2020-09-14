import * as React from "react";
import { HashRouter, Switch, Route } from "react-router-dom";
import { MainPage } from "./pages/mainPage";
import { SecondaryPage } from "./pages/secondaryPage";

export const App = () => {

  return (
    <>
      <HashRouter>
        <Switch>
          <Route exact={true} path="/" component={MainPage} />
          <Route path="/details" component={SecondaryPage} />
        </Switch>
      </HashRouter>
    </>
  );
};
