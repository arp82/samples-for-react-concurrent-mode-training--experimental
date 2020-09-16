# 01 Concurrent mode basics

## Initial setup

For this lesson, we will take the `00 Base sample` project as the starting point for our application. There a couple of points that are worth to revise before adding anything new. If we open the `package.json` file, we can see that we are using the experimental versions of `react` and `react-dom`. In reality, this `package.json` file was intially configured to run with version `16.8.XX`, but since the Concurrent Mode and Suspense features are not yet part of React stable releases, we need to replace them in our project (by just running `npm install react@experimental react-dom@experimental`). Also, keep in mind that, since this is unstable, unreleased code, if you end up using a different version to the one indicated below, some functionality may not be available as-is. Thus, consider replacing the specific hash in your dependencies `package.json` entry with the one provided in the next lines.
```
  },
  "dependencies": {
    "react": "0.0.0-experimental-aae83a4b9",
    "react-dom": "0.0.0-experimental-aae83a4b9",
    "react-router-dom": "^4.3.1"
  }
}
```

The second thing worth noting is related with our `index.tsx` file. If we open it, it should read as follows:
```typescript
import {} from "react-dom/experimental";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { App } from "./app";

// ReactDOM.render(<App />, document.getElementById("root"));

const rootEl = document.getElementById('root') as HTMLElement // createRoot does not accept null values
const root = ReactDOM.createRoot(rootEl)
root.render(<App />)
```

There are some changes here that demand some explanation. First of all, instead of using `ReactDOM.render` straight-away to supply both our app component and the HTML node where it should be attached in the DOM, we are taking an intermediate step by calling `createRoot`. This is necessary in order to enable Concurrent Mode. At the same time, since we are using Typescript and the new features do not have types yet, we need to circumvent type errors somehow. That is why we have added the line `import {} from "react-dom/experimental"`, and also, since `createRoot` expects a non-null value, we have casted the returned element by the `getElementById` call to the `HTMLElement` type explicitly (in a generic scenario, you may get a null value here if no element is found that matches the id provided, but that is not the case here: we know that our `root` element is always present in the `index.html` file).

## Adding a concurrent-mode-compliant API

Next, we are going to define some fake end points in our project to perform async calls. Concurrent Mode in general can be applied to any kind of asynchronous action, but the most common use case is probably to perform a call to an external back-end service. Thus, we are going to create an `./src/api` folder, and we are going to add a barrel `index.ts` file and a `myEndPoints.ts` file with the following contents.

myEndpoints.ts
```typescript
interface CodeReviewer {
  name: string;
  id: number;
}

export function fetchCodeReviewers() {
  console.log("fetching code reviewers...");
  return new Promise<CodeReviewer[]>(resolve => {
    setTimeout(() => {
      console.log("fetched reviewers");
      resolve([
        { name: "Marioli", id: 3 },
        { name: "Carlos", id: 5 },
        { name: "Lucia", id: 7 },
      ]);
    }, 1000);
  });
}

interface CodeReviewComment {
  id: number,
  text: string,
  reviewerId: number,
}

function fetchComments() {
  console.log("fetching comments...");
  return new Promise<CodeReviewComment[]>(resolve => {
    setTimeout(() => {
      console.log("fetched comments");
      resolve([
        { id: 0, reviewerId: 3, text: "I do not like this true here, I will create a constant with a meaning name" },
        { id: 1, reviewerId: 3, text: "From my point of view make the code less readable" },
        { id: 2, reviewerId: 3, text: "What does it do?" },
        { id: 3, reviewerId: 5, text: "Please, refactor to functional component" },
        { id: 4, reviewerId: 5, text: "The trees do not let you see the forest" },
        { id: 5, reviewerId: 7, text: "No comments" },
      ]);
    }, 2000);
  });
}
```

index.ts
```javascript
export { fetchCodeReviewers, fetchComments } from "./myEndPoints";
```

Now, we are going to add a separate file called `wrapPromise.ts`, with the code below:
```typescript
export const wrapPromise = <T extends {}>(promise: Promise<T>) => {
  let status = "pending";
  let result;
  let suspender = promise.then(
    response => {
      status = "success";
      result = response;
    },
    error => {
      status = "error";
      result = error;
    }
  );
  return {
    read(): T {
      if (status === "pending") {
        throw suspender;
      } else if (status === "error") {
        throw result;
      } else if (status === "success") {
        return result;
      }
    }
  };
}
```

And we are going to modify our `myEndPoints.ts` file to add the following new method
```diff
+export const fetchCodeReviewData = () => {
+  const codeReviewersPromise = fetchCodeReviewers();
+  const commentsPromise = fetchComments();
+  return {
+    reviewers: wrapPromise<CodeReviewer[]>(codeReviewersPromise),
+    comments: wrapPromise<CodeReviewComment[]>(commentsPromise),
+  }
+};
```

And the barrel file:
```diff
-export { fetchCodeReviewers, fetchComments } from "./myEndPoints";
+export { fetchCodeReviewers, fetchComments, fetchCodeReviewData } from "./myEndPoints";
```

Now let's review what we are doing here. We have defined two fake endpoints and we are exporting them, nothing new under the sun here. But we have also defined a third "endpoint" which actually calls the two previous ones in a combined fashion, offering a closure that provides access to returned promises of each one. However, we have wrapped said promises using a function so that instead of returning the actual promise, we return an object with a `read()` method. Calling this method will throw an error if the corresponding wrapped promise has not finished yet (status `pending`) or if the call failed (status `error`). If the asynchronous operation finished successfully, though, `read()` will return the actual value fetched by that promise. This is a very barebones implementation of how a concurrent-mode-compliant API is expected to behave (we will see later why we need this `read()` method and why we need it to throw errors). It is, obviously, not a good implementation to wrap existing APIs, but it serves for our purposes in regard to this training.


## Different approaches to fetching data and subsequently rendering the view
There are several possible strategies to fetch data and render the view according to the data retrieved. The use of Suspense could be understood as the logical next step on how to fetch data while enabling rendering the view in a way that it is user-friendly. Quoting the official React docs, we could classify these approaches in three groups initially:
- _**Fetch-on-render**: Start rendering components. Each of these components may trigger data fetching in their effects and lifecycle methods. This approach often leads to “waterfalls”._
- _**Fetch-then-render**: Start fetching all the data for the next screen as early as possible. When the data is ready, render the new screen. We can’t do anything until the data arrives._
- _**Render-as-you-fetch**: Start fetching all the required data for the next screen as early as possible, and start rendering the new screen immediately — before we get a network response. As data streams in, React retries rendering components that still need data until they’re all ready._

Let's see each of these approaches separately

### Fetch-on-render
This is what we do when performing our fetch calls within `useEffect` clauses. The main problem that might arise here is that we may trigger waterfall effects, as nested components will only call their corresponding `useEffect`-controlled fetchers after their parent has successfully finished fetching whatever data it needs. Let us see this with an example. Let's add the following changes to our `secondaryPage.tsx` file
```diff
+import { fetchComments, fetchCodeReviewers } from "../api";
+
+interface ReviewerVM {
+  name: string;
+  id: number;
+}
+
+interface CommentsVM {
+  id: number;
+  text: string;
+  reviewerId: number;
+}
+
+const PullRequestComments = () => {
+  const [comments, setComments] = React.useState<CommentsVM[]>(null);
+
+  React.useEffect(() => {
+    fetchComments().then(c => setComments(c));
+  }, []);
+
+  if (comments === null) {
+    return <h2>Loading comments...</h2>;
+  }
+  return (
+    <ul>
+      {comments.map(comment => (
+        <li key={comment.id}>{`Reviewer #${comment.reviewerId} says: ${comment.text}`}</li>
+      ))}
+    </ul>
+  );
+}
+
+const PullRequestReviewers = () => {
+  const [reviewers, setReviewers] = React.useState<ReviewerVM[]>(null);
+
+  React.useEffect(() => {
+    fetchCodeReviewers().then(r => setReviewers(r));
+  }, []);
+
+  if (reviewers === null) {
+    return <p>Loading reviewers...</p>;
+  }
+  return (
+    <ul>
+      {reviewers.map(reviewer => (
+        <h2 key={reviewer.id}>{`Reviewer ${reviewer.id}: ${reviewer.name}`}</h2>
+      ))}
+      <PullRequestComments />
+    </ul>
+  );
+}
+
export const SecondaryPage = () => 
  <div>
-    <h2>Detailing things</h2>
+    <PullRequestReviewers>
    <br />
    <Link to="/">Back to home</Link>
  </div>

```

If we run our app now and navigate to the details page, we will see a waterfall effect: the first component is waiting for its data to display the list of reviewers, which is expected. However, the child component does not start fetching for the PR comments until its parent has finished gathering all the data.

### Fetch-then-render
In order to prevent this waterfall effect, we could instead call all of our fetch methods in parallel. Let's refactor our code in `SecondaryPage.tsx` to this effect.
```diff
import * as React from "react";
import { Link } from "react-router-dom";
import { fetchComments, fetchCodeReviewers } from "../api";

interface ReviewerVM {
  name: string;
  id: number;
}

interface CommentsVM {
  id: number;
  text: string;
  reviewerId: number;
}

+interface PRRevierwersProps {
+  reviewers: ReviewerVM[];
+  comments: CommentsVM[];
+}
+
+interface PRCommentsProps {
+  comments: CommentsVM[];
+}

-const PullRequestComments = () => {
-  const [comments, setComments] = React.useState<CommentsVM[]>(null);
-
-  React.useEffect(() => {
-    fetchComments().then(c => setComments(c));
-  }, []);
+const PullRequestComments = (props: PRCommentsProps) => {
+  const { comments } = props;
  if (comments === null) {
    return <h2>Loading comments...</h2>;
  }
  return (
    <ul>
      {comments.map(comment => (
        <li key={comment.id}>{`Reviewer #${comment.reviewerId} says: ${comment.text}`}</li>
      ))}
    </ul>
  );
}

-const PullRequestReviewers = () => {
-  const [reviewers, setReviewers] = React.useState<ReviewerVM[]>(null);
-
-  React.useEffect(() => {
-    fetchCodeReviewers().then(r => setReviewers(r));
-  }, []);
+const PullRequestReviewers = (props: PRRevierwersProps) => {
+  const { reviewers, comments } = props;
  if (reviewers === null) {
    return <p>Loading reviewers...</p>;
  }
  return (
    <ul>
      {reviewers.map(reviewer => (
        <h2 key={reviewer.id}>{`Reviewer ${reviewer.id}: ${reviewer.name}`}</h2>
      ))}
      <PullRequestComments comments={comments} />
    </ul>
  );
}

-export const SecondaryPage = () => 
-  <div>
-    <h2>Detailing things</h2>
-    <PullRequestReviewers>
-    <br />
-    <Link to="/">Back to home</Link>
-  </div>
+export const SecondaryPage = () => {
+  const [comments, setComments] = React.useState<CommentsVM[]>(null);
+  const [reviewers, setReviewers] = React.useState<ReviewerVM[]>(null);
+
+  React.useEffect(() => {
+    Promise.all([fetchCodeReviewers(), fetchComments()])
+      .then(([r, c]) => ({reviewers: r, comments: c})) // Note the similarity with fetchCodeReviewData
+      .then((data) => {
+        setReviewers(data.reviewers);
+        setComments(data.comments);
+      });
+  }, []);
+
+  return (
+    <div>
+      <PullRequestReviewers reviewers={reviewers} comments={comments}/>
+      <br />
+      <Link to="/">Back to home</Link>
+    </div>
+  );
+};
```
No more waterfall, but now we have to wait for the slower of the two fetch calls before we can actually render anything. Technically, we could fully run both fetch calls in parallel without using a `Promise.all` structure to prevent this, and that would quite doable in this simple application. But in larger applications, that approach is not exempt of other issues: as data structures and the component tree become progressively more complex, so it is harder to ensure that the data we are using at a given point is correct, that there are no stale mismatches (such as displaying PR comments for a user that is no longer in the database), and so on. Thus, we can fix this user experience problem strictly speaking, but at the cost of losing the simplicity of having all of our calls centralized in a single fetch, which is easier to handle as the application grows.


### Render-as-you-fetch
We enter now the approach that favors the use of Concurrent Mode and the new Suspense mechanic. The idea here is that as soon as we start fetching, we start rendering, updating progressively our view components as the fetch calls finish. Let's create a new component called `detailsPage.tsx`, and let's replace our `SecondaryPage` component with this new one. We will need to modify our routing data in `app.tsx`.

```diff
-import { SecondaryPage } from "./pages/secondaryPage";
+import { DetailsPage } from "./pages/detailsPage";

export const App = () => {

  return (
    <>
      <HashRouter>
        <Switch>
          <Route exact={true} path="/" component={MainPage} />
-          <Route path="/details" component={SecondaryPage} />
+          <Route path="/details" component={DetailsPage} />
        </Switch>
      </HashRouter>
    </>
  );
};

```

And now, let us write the code for our `detailsPage.tsx` file
```typescript
import * as React from "react";
import { Link } from "react-router-dom";
import { fetchCodeReviewData } from "../api";

interface ReviewerVM {
  name: string;
  id: number;
}

interface CommentsVM {
  id: number;
  text: string;
  reviewerId: number;
}

interface AsyncResource<T> {
  read: () => T;
}

interface PRRevierwersProps {
  reviewers: AsyncResource<ReviewerVM[]>;
}

interface PRCommentsProps {
  comments: AsyncResource<CommentsVM[]>;
}

const PullRequestComments = (props: PRCommentsProps) => {
  const comments = props.comments.read();
  return (
    <ul>
      {comments.map(comment => (
        <li key={comment.id}>{`Reviewer #${comment.reviewerId} says: ${comment.text}`}</li>
      ))}
    </ul>
  );
}

const PullRequestReviewers = (props: PRRevierwersProps) => {
  const reviewers = props.reviewers.read();
  return (
    <ul>
      {reviewers.map(reviewer => (
        <h2>{`Reviewer ${reviewer.id}: ${reviewer.name}`}</h2>
      ))}
    </ul>
  );
}

export const DetailsPage = () => {
  const resource = fetchCodeReviewData();
  const { reviewers, comments } = resource;

  return (
    <div>
      <React.Suspense fallback={<h2>Loading reviewers...</h2>}>
        <PullRequestReviewers reviewers={reviewers}/>
        <React.Suspense fallback={<h2>Loading comments...</h2>}>
          <PullRequestComments comments={comments} />
        </React.Suspense>
      </React.Suspense>
      <br />
      <Link to="/">Back to home</Link>
    </div>
  );
};
```

So, there is a lot going on here, let us review this step by step.

First of all, we are now using a `Suspense` component to wrap our actual components. This component is actually doing some magic behind the scenes. Basically, it tries to render its child component, but if said component fails to render and 'throws' an exception for some reason, the `Suspense` component catches this event and returns instead the component indicated in the `fallback` prop.

Speaking of throwing, we are not using promises now. Instead, we are using the third endpoint we defined in our API, which defined a closure to wrap the actual promises. Then, for each of this promises, it returned instead a resource, an object with a `read()` method, which subsequently returned the requested data in case of a successful, finished call, and threw an error otherwise. This error is now "caught" (sort of) by the `Suspense` component and instead replaced by the fallback component. Notice how each component now tries to read the data if it is available. If it is, good, the component finishes rendering. But if the actual call was still pending or failed, the component stops rendering, throws the corresponding error, and delegates its rendering responsabilities in its parent `Suspense` wrapper. When that happens, React does not actually render the component itselt, the component is "suspended", as per de React docs. As more data streams in, React will try to rerender, until no fallback is needed and the whole component tree is fully rendered.

Also, just to keep the interfaces clear, we have also defined an `AsyncResource` generic type to represent our new props data types, which may or may not have actual data.


## Start fetching before you start rendering
One message that the current React docs try to convey strongly is that, for optimal performance, it would be better to start the fetch call before the actual render starts, so that we can minimize users' waiting time as much as possible. We are not doing exactly that, though: our call to the resource is within the actual render method of the component. We could move it outside the component, like this:
```diff
}

+  const resource = fetchCodeReviewData();

export const DetailsPage = () => {
-  const resource = fetchCodeReviewData();
  const { reviewers, comments } = resource;

  return (
    <div>
```

And if we run it, it will work, but if we try to navigate back and forth between pages, you should notice that the "spinners" are never again to be seen. Why is so? The data is never being fetched again... which sort of makes sense, since we have the call to the resource outside of the body of the component. In the case of this silly application, it does not really matter much, but in a bigger app, this means we cannot refresh back if the data in the backend changes with this implementation. In this case, the recommended way in the documentation to trigger the resource fetching calls is to do so at the time we navigate from one view to another. For now, let's keep our code in `detailsPage.tsx` as it was at the end of the prior section, and let us create a new module called `reviewerDetailsApp.tsx`. But before writing the code for this new module, let us tweak our fake end point slightly.

```diff
import { wrapPromise } from "./wrapPromise";

interface CodeReviewer {
  name: string;
  id: number;
}

+const BE_REVIEWERS = [
+  { name: "Marioli", id: 3 },
+  { name: "Carlos", id: 5 },
+  { name: "Lucia", id: 7 },
+];
+
+const BE_COMMENTS = [
+  { id: 0, reviewerId: 3, text: "I do not like this true here, I will create a constant with a meaning name" },
+  { id: 1, reviewerId: 3, text: "From my point of view make the code less readable" },
+  { id: 2, reviewerId: 3, text: "What does it do?" },
+  { id: 3, reviewerId: 5, text: "Please, refactor to functional component" },
+  { id: 4, reviewerId: 5, text: "The trees do not let you see the forest" },
+  { id: 5, reviewerId: 7, text: "No comments" },
+];

export function fetchCodeReviewers() {
  console.log("fetching code reviewer...");
  return new Promise<CodeReviewer[]>(resolve => {
    setTimeout(() => {
      console.log("fetched reviewers");
-      resolve([
-        { name: "Marioli", id: 3 },
-        { name: "Carlos", id: 5 },
-        { name: "Lucia", id: 7 },
-      ]);
+      resolve(BE_REVIEWERS)
    }, 1000);
  });
}

interface CodeReviewComment {
  id: number,
  text: string,
  reviewerId: number,
}

function fetchComments() {
  console.log("fetching comments...");
  return new Promise<CodeReviewComment[]>(resolve => {
    setTimeout(() => {
      console.log("fetched comments");
-      resolve([
-        { id: 0, reviewerId: 3, text: "I do not like this true here, I will create a constant with a meaning name" },
-        { id: 1, reviewerId: 3, text: "From my point of view make the code less readable" },
-        { id: 2, reviewerId: 3, text: "What does it do?" },
-        { id: 3, reviewerId: 5, text: "Please, refactor to functional component" },
-        { id: 4, reviewerId: 5, text: "The trees do not let you see the forest" },
-        { id: 5, reviewerId: 7, text: "No comments" },
-      ]);
+     resolve(BE_COMMENTS)
    }, 2000);
  });
}

+export const fetchReviewer = (id: number) => {
+  console.log("fetching code reviewer...", id);
+  return new Promise<CodeReviewer>(resolve => {
+    setTimeout(() => {
+      console.log("fetched reviewer", id);
+      resolve(BE_REVIEWERS.find(reviewer => reviewer.id === id));
+    }, 1000);
+  });
+}
+
+export const fetchCommentsForReviewer = (id: number) => {
+  console.log("fetching comments...", id);
+  return new Promise<CodeReviewComment[]>(resolve => {
+    setTimeout(() => {
+      console.log("fetched comments", id);
+      resolve(BE_COMMENTS.filter(comment => comment.reviewerId === id));
+    }, 2000);
+  });
+}
+
+export const fetchCodeReviewerData = (id: number) => {
+  const codeReviewerPromise = fetchReviewer(id);
+  const commentsForReviewerPromise = fetchCommentsForReviewer(id);
+  return {
+    id,
+    reviewer: wrapPromise<CodeReviewer>(codeReviewerPromise),
+    comments: wrapPromise<CodeReviewComment[]>(commentsForReviewerPromise),
+  }
+};
```

And let's also update the code for the barrel file to expose our new resources
```diff
-export { fetchCodeReviewers, fetchComments, fetchCodeReviewData } from "./myEndPoints";
+export {
+  fetchCodeReviewers, fetchComments, fetchCodeReviewData,
+  fetchCodeReviewerData, fetchCommentsForReviewer, fetchReviewer,
+} from "./myEndPoints";
```


Since we are going to reuse them, let's move our view models into a separate `model.ts` file
```typescript
export interface ReviewerVM {
  name: string;
  id: number;
}

export interface CommentsVM {
  id: number;
  text: string;
  reviewerId: number;
}

export interface AsyncResource<T> {
  read: () => T;
}
```

And update our `detailsPage.tsx` file accordingly
```diff
import { fetchCodeReviewData } from "../api";
+import { ReviewerVM, AsyncResource, CommentsVM } from "./model";
-interface ReviewerVM {
-  name: string;
-  id: number;
-}
-
-interface CommentsVM {
-  id: number;
-  text: string;
-  reviewerId: number;
-}
-
-interface AsyncResource<T> {
-  read: () => T;
-}

interface PRRevierwersProps {
  reviewers: AsyncResource<ReviewerVM[]>;
}
```

Let's also create a new route in `App.tsx`. 
```diff
import { DetailsPage } from "./pages/detailsPage";
+import { ReviewerDetailsApp } from "./pages/reviewerDetailsApp";

export const App = () => {

  return (
    <>
      <HashRouter>
      <HashRouter>
        <Switch>
          <Route exact={true} path="/" component={MainPage} />
          <Route path="/details" component={DetailsPage} />
+          <Route path="/reviewerDetails" component={ReviewerDetailsApp} />
        </Switch>
      </HashRouter>
    </>
  );
};
```

Let's get into the implementation of out `reviewerDetailsApp.tsx`. We want this page to mimic a small app, and so, it is going to have its own pages, or sub-pages. Each subpage will have the need of one particular resource, but those resources will be loaded "globally" from the app, and provided to each subpage as props. Let us take a look into the code
```typescript
import * as React from "react";
import { fetchCodeReviewerData } from "../api";
import { ReviewerVM, AsyncResource, CommentsVM } from "./model";

// Types
interface ReviewerResource {
  reviewer: AsyncResource<ReviewerVM>;
  comments: AsyncResource<CommentsVM[]>
}

interface ReviewerPageProps {
  resource: ReviewerResource;
}

interface ReviewerProps {
  resource: ReviewerResource;
}

interface CommentsProps {
  resource: ReviewerResource;
}

// App
const getNextId = (id: number) => {
  switch(id) {
    case 3:
      return 5;
    case 5: 
      return 7;
    default:
      return 3;
  }
};
const initialResource = fetchCodeReviewerData(3);

export const ReviewerDetailsApp = () => {
  const [resource, setResource] = React.useState(initialResource);

  return (
    <>
      <button
        onClick={() => {
          const nextUserId = getNextId(resource.id);
          setResource(fetchCodeReviewerData(nextUserId));
        }}
      >
        Next
      </button>
      <ReviewerPage resource={resource} />
    </>
  );
};

// Subpages and components
const ReviewerPage = (props: ReviewerPageProps) => {
  const { resource } = props;
  return (
    <React.Suspense fallback={<h2>Loading reviewers...</h2>}>
      <PullRequestReviewer resource={resource} />
      <React.Suspense fallback={<h2>Loading comments...</h2>}>
        <PullRequestComments resource={resource} />
      </React.Suspense>
    </React.Suspense>
  );
}

const PullRequestComments = (props: CommentsProps) => {
  const comments = props.resource.comments.read();
  return (
    <ul>
      {comments.map(comment => (
        <li key={comment.id}>{comment.text}</li>
      ))}
    </ul>
  );
}

const PullRequestReviewer = (props: ReviewerProps) => {
  const reviewer = props.resource.reviewer.read();
  return <h1>{`Reviewer: ${reviewer.name}`}</h1>;
};
```

Basically, we are mimicking the behaviour of a very Redux-lite application: our app has a piece of global state that stores the `resource` we are currently fetching/using. Whenever we change from one reviewer page to another, the first thing we do is to call our `fetchCodeReviewerData` again with the id of the next reviewer, so that we start rendering the specific reviewer view after the fetch call has been started.

## Preventing race conditions

Let's now perform a small exercise: imagine that our fake endpoints had been defined with randomized timeout values. What would happen if our reviewerDetailApp had been implemented without using `Suspense`? Let us assume that the code had been like the one below (let's save it in a `reviewerDetailsAppWithRaceCondition.tsx` file)
```typescript
import * as React from "react";
import { fetchReviewer, fetchCommentsForReviewer } from "../api";
import { ReviewerVM, AsyncResource, CommentsVM } from "./model";

// Types
interface ReviewerPageProps {
  id: number;
}

interface ReviewerProps {
  id: number;
}

interface CommentsProps {
  id: number;
}

// App
const getNextId = (id: number) => {
  switch(id) {
    case 3:
      return 5;
    case 5: 
      return 7;
    default:
      return 3;
  }
};

export const ReviewerDetailsApp = () => {
  const [id, setId] = React.useState(3);

  return (
    <>
      <button
        onClick={() => {
          const nextUserId = getNextId(id);
          setId(nextUserId);
        }}
      >
        Next
      </button>
      <ReviewerPage id={id} />
    </>
  );
};

// Subpages and components
const ReviewerPage = (props: ReviewerPageProps) => {
  const { id } = props;

  return (
    <>
      <PullRequestReviewer id={id} />
      <PullRequestComments id={id} />
    </>
  );
}

const PullRequestComments = (props: CommentsProps) => { 
  const [comments, setComments] = React.useState<CommentsVM[]>(null);
  React.useEffect(() => {
    fetchCommentsForReviewer(props.id).then(comments => setComments(comments));
  }, [props.id]);

  if (comments === null) {
    return <h2>Loading comments...</h2>;
  }
  return (
    <ul>
      {comments.map(comment => (
        <li key={comment.id}>{comment.text}</li>
      ))}
    </ul>
  );
}

const PullRequestReviewer = (props: ReviewerProps) => {
  const [reviewer, setReviewer] = React.useState<ReviewerVM>(null);
  React.useEffect(() => {
    fetchReviewer(props.id).then(reviewer => setReviewer(reviewer));
  }, [props.id]);

  if (reviewer === null) {
    return <p>Loading reviewer...</p>;
  }
  return <h1>{`Reviewer: ${reviewer.name}`}</h1>;
};
```

There is nothing wrong with this code at first glance, but imagine that we change our timeouts to a randomized value using `Math.random()`, re-run the application and click several times on `Next` button. Aside from brief periods of incongruency (which are to be expected as our spinners only have effect during the first load), you may end up sometimes with a combination of reviewers and comments that are not matching. The issue here is that two different flows or lifecycles in action: on the one hand, we have React components, which get re-rendered as we change props and state values; on the other hand, we have the actual async flow of the callbacks to the backend. It may happen that, for a given reviewer id (say, id = 3), the `fetchReviewer` call takes too long, while the `fetchCommentsForReviewer` is executed blazingly fast. Then, suddenly, because we have clicked `Next` again before `fetchReviewer` ends, a new side effect is triggered, now for the reviewer with id = 5. And this time, both `fetchReviewer` and `fetchCommentsForReviewer` finish very fast, so fast that we get the results before the call for `fetchReviewer` with id = 3 had finished!. Eventually, the value from the fetch call for id = 3 is returned from the backend and replaced the one we had for id = 5, thus creating an incongruency. 

Obviously, in a real scenario, this situation can be controlled by returning a clean-up function in our `useEffect` callbacks in order to cancel pending calls to the backend. However, it is worth noticing how our original implementation with ´Suspense´ did not have this issue at all. The reason for that is that whenever we perform a fetch call in `reviewerDetailsApp`, we immediately update the state. Hence, both flows are inherently synchronized in this case, removing the need for additional control clauses to cancel pending calls or clean-up resources that we would have with the more traditional approach.


## Error handling
When working with `Suspense`, we are no longer returning promises but resources. How could we then catch errors to treat them separately when the remote call fails? Let's remember again the structure of our `wrapPromise` method.

```typescript
  let status = "pending";
  let result;
  let suspender = promise.then(
    response => {
      status = "success";
      result = response;
    },
    error => {
      status = "error";
      result = error;
    }
  );
  return {
    read(): T {
      if (status === "pending") {
        throw suspender;
      } else if (status === "error") {
        throw result;
      } else if (status === "success") {
        return result;
      }
    }
  };
```

We can see that, while the promise is "pending", what we throw is actually a promise (hence, we can guess a bit how the `Suspense` component triggers once the promise is fulfilled or rejected) and when we have an actual error, we just throw a regular error. It is possible then to create a mechanism that enables us to catch this case, as they are clearly differentiated. The currently available experimental structure provided by React to catch errors using `Suspense` is call error boundary. In order to catch resource fetching errors, we will need then to define an Error Boundary Component. Currently, these components have to be defined using classes. So, that said, let's create an `errorBoundary.tsx` file with the contents below
```typescript
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
```

Now, we can use this component to wrap our `Suspense` components in order to provide error handling
```diff
// Subpages and components
const ReviewerPage = (props: ReviewerPageProps) => {
  const { resource } = props;
  return (
+    <ErrorBoundary fallback={<h1>Could not fetch reviewer</h1>}>
      <React.Suspense fallback={<h2>Loading reviewers...</h2>}>
        <PullRequestReviewer resource={resource} />
+        <ErrorBoundary fallback={<h2>Could not fetch comments</h2>}>
          <React.Suspense fallback={<h2>Loading comments...</h2>}>
            <PullRequestComments resource={resource} />
          </React.Suspense>
+        </ErrorBoundary>
      </React.Suspense>
+    </ErrorBoundary>
  );
}
```
