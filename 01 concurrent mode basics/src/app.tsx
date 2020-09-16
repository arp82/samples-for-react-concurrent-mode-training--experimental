import * as React from "react";
import { HashRouter, Switch, Route } from "react-router-dom";
import { MainPage } from "./pages/mainPage";
import { DetailsPage } from "./pages/detailsPage";
import { ReviewerDetailsApp } from "./pages/reviewerDetailsApp";

export const App = () => {

  return (
    <>
      <HashRouter>
        <Switch>
          <Route exact={true} path="/" component={MainPage} />
          <Route path="/details" component={DetailsPage} />
          <Route path="/reviewerDetails" component={ReviewerDetailsApp} />
        </Switch>
      </HashRouter>
    </>
  );
};
