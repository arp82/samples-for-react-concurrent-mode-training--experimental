# 02 Concurrent UI patterns

## Transitions

### The three steps
We will take the code from `01 concurrent mode basics` as the starting point for this lesson. In the last session, we had defined a sort of sub-App (`reviewerDetailsApp`) to illustrate some design patterns when working with `Suspense`. If we run the app again, we may notice that, as soon as we click on the `Next` button, we change our state, therefore loading the next reviewer page, even though no data is being shown yet. Then, after a brief delay, we see some reviewer data (their name, basically), but we still have to wait a bit longer for the full page to be properly loaded with the list of comments. These 3 steps are defined in the official docs as `receded`, `skeleton` and `complete`.
- Receded state: our application/page/component has not yet been able to fetch/load the minimum amount of information to display something of value in our screen. Thus, we have to recede to some spinner-like render that indicates the user that the data is still being fetched.
- Skeleton state: part of the screen has already been rendered, but there is still some missing blocks that are being fetched. This is what would happen once our reviewer data is loaded but before the list of comments has been successfully retrieved from the API. Unlike the previous receded state, this state does provide some relevant information to the user beyond "data is being fetched".
- Complete state: our screen has successfully loaded all of its elements. This is the desired final state.

This flow (receded -> skeleton -> complete) implies that, as soon as we click on `Next`, the first thing the user sees provides no utility whatsoever. Could we do better than that? The official docs consider a fourth state that enables a different, preferred flow, as illustrated in [the image here](https://reactjs.org/docs/concurrent-mode-patterns.html#the-three-steps): pending -> skeleton -> complete. The "pending" state would basically allow us to stay in the previous page until we have useful data loaded in the next screen to be rendered. In order to achieve this, we are going to introduce a new concept: transitions.

### Adding transitions
Let us apply the following changes to our `reviewerDetailsApp.tsx` file.
```diff
export const ReviewerDetailsApp = () => {
  const [resource, setResource] = React.useState(initialResource);
+  // @ts-ignore -- types for useTransition are not available yet
+  const [startTransition, pending] = React.useTransition({ timeoutMs: 3000 });

  return (
    <>
      <button
+        disabled={pending}
        onClick={() => {
-          const nextUserId = getNextId(resource.id);
-          setResource(fetchCodeReviewerData(nextUserId));
+          startTransition(() => {
+            const nextUserId = getNextId(resource.id);
+            setResource(fetchCodeReviewerData(nextUserId));
+          });
        }}
      >
        Next
      </button>
+      {pending ? 'Loading...' : null}      
      <ReviewerPage resource={resource} />
    </>
  );
};
```

So, what is going on here? This new hook, `useTransition`, returns a `startTransition` function  and a `pending` boolean value. We can wrap our state update in a callback that is provided as an argument to the `startTransition` function. This tells React to delay setting the state until the data from the resource has been succesfully fetched. The `pending` boolean can be used to provide some additional information to the user so that they can know that something is going behind the scenes (hence why we disable the button and show a "Loading..." text besides the button). We can also provide an initialization object with a maximum timeout value to wait for before actually transitioning to the next page (in fact, if we change it to a very small value, we should experience the same behaviour as if we had no transition at all)

In a way, the loading page and the previous page are coexisting at the same time, but we keep seeing the old page until the new page has finished loading its data. In that moment, React gives us the switcheroo, so to speak, and then we can see the new page in all its completed glory. The official docs like to compare this process to something akin to code branching: the new, currently being loaded page exists in a separate branch, and it is only merged into the currently visible branch once it is given the green light, which, in this case, means "once everything has been fetched successfully".

We could actually integrate the transition itself inside a custom buttom component. Let's do that in a new `src/components/button.tsx` component
```typescript
import * as React from "react";

interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
}

export const Button: React.FC<ButtonProps> = ({onClick, children}) => {
  //@ts-ignore
  const [startTransition, pending] = React.useTransition({ timeoutMs: 10000 });

  const handleClick = () => {
    startTransition(() => { onClick(); });
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={pending}
      >
        {children}
      </button>
      { pending ? 'Loading...' : null }
    </>
  );
}
```

We add a barrel `index.ts` for the components folder as well
```typescript
export { Button } from "./button";
```

And we replace the button in our `reviewerDetailsApp.tsx` component with the new one.
```diff
  const [resource, setResource] = React.useState(initialResource);
-  // @ts-ignore -- types for useTransition are not available yet
-  const [startTransition, pending] = React.useTransition({ timeoutMs: 7000 });

+  const handleClick = () => {
+    const nextUserId = getNextId(resource.id);
+    setResource(fetchCodeReviewerData(nextUserId));
+  };

  return (
    <>
-      <button
-        disabled={pending}
-        onClick={() => {
-          startTransition(() => {
-            const nextUserId = getNextId(resource.id);
-            setResource(fetchCodeReviewerData(nextUserId));
-          });
-        }}
-      >
-        Next
-      </button>
-      {pending ? 'Loading...' : null}
+      <Button onClick={handleClick}>
+        Refresh
+      </Button>
      <ReviewerPage resource={resource} />
    </>
  );
```

## Implementing the pending -> skeleton -> complete pattern with transitions

So far, we have seen that we can use transitions to defer the visualisation of the page until the data is fetched. Now, let's modify our application to add a behaviour that shows the afore-mentioned flow. We will first start implementing the receded -> skeleton -> complete pattern for better clarity. Let's modify our `reviewerDetailsApp.tsx` as follows.
```diff
// Types
interface ReviewerResource {
  reviewer: AsyncResource<ReviewerVM>;
  comments: AsyncResource<CommentsVM[]>
}

+interface HomePageProps {
+  onClick: () => void;
+}

interface ReviewerPageProps {
  resource: ReviewerResource;
+  onClick: () => void;
}

interface ReviewerProps {
  resource: ReviewerResource;
  onClick: () => void;
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

+enum TABS {
+  HOME = 'HOME',
+  REVIEWER_DETAILS = 'REVIEWER_DETAILS',
+}

export const ReviewerDetailsApp = () => {
  const [resource, setResource] = React.useState(initialResource);
+  const [tab, setTab] = React.useState<string>(TABS.HOME);

  const handleClick = () => {
    const nextUserId = getNextId(resource.id);
    setResource(fetchCodeReviewerData(nextUserId));
+    setTab(TABS.REVIEWER_DETAILS);
  };

+  const renderPage = () => {
+    switch (tab) {
+      case TABS.HOME:
+        return <HomePage onClick={handleClick} />;
+      case TABS.REVIEWER_DETAILS:
+        return <ReviewerPage onClick={handleClick} resource={resource} />;
+    }
+  }

  return (
    <>
-      <Button onClick={handleClick}>
-        Next
-      </Button>
-      <ReviewerPage resource={resource} />
+      <React.Suspense fallback={<h1>Loading Reviewer Details App...</h1>}>
+        {renderPage()}
+      </React.Suspense>
    </>
  );
};

// Subpages and components
+const HomePage: React.FC<HomePageProps> = ({ onClick }) => (
+  <>
+    <h1>Home Page</h1>
+    <button onClick={onClick}>
+      Open reviewer view
+    </button>
+  </>
+);

-const ReviewerPage = (props: ReviewerPageProps) => {
-  const { resource } = props;
-  return (
-    <ErrorBoundary fallback={<h1>Could not fetch reviewer</h1>}>
-      <React.Suspense fallback={<h2>Loading reviewers...</h2>}>
-        <PullRequestReviewer resource={resource} />
-        <ErrorBoundary fallback={<h2>Could not fetch comments</h2>}>
-          <React.Suspense fallback={<h2>Loading comments...</h2>}>
-            <PullRequestComments resource={resource} />
-          </React.Suspense>
-        </ErrorBoundary>
-      </React.Suspense>
-    </ErrorBoundary>
-  );
-}

+const ReviewerPage: React.FC<ReviewerPageProps> = ({ resource, onClick }) => (
+  <>
+    <PullRequestReviewer resource={resource} />
+    <button onClick={onClick}>
+      Next Reviewer
+      </button>
+    <React.Suspense fallback={<h2>Loading comments...</h2>}>
+      <PullRequestComments resource={resource} />
+    </React.Suspense>
+  </>
+);

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

It is a lot of changes, but in reality, what we have done is just add an entry-point home page that accepts an `onClick` prop, and modified the existing `ReviewerPage` to accept an `onClick` prop as well, in both cases adding a button to both pages to trigger the `onClick` event listener. Also, since the parent app has everything wrapped in `Suspense` tabs, we have removed the first `Suspense` wrap in `ReviewerPage`. And that's it pretty much. On first load, we start at `HomePage`, and as soon as we start clicking the button, we go cycling around through the Pull Request reviewers in our database with each subsequent click (this behaviour is implemented by the `handleClick` method, which is passed through to all of our `onClick` listeners).

Where are the different steps of the `receded -> skeleton -> complete` cycle?
- We can see that, whenever we click on the button, the `Reviewer Details App loading...` message is briefly shown. As before, our `PullRequestReviewer` component is asking for the reviewer data, and since it has not finished being fetched, it suspends, falling back to the closest parent fallback available. That, in essence, is the one at App level. This is a `receded state`: the whole screen stops having valuable data as soon as we start fetching data.
- Soon after that, the reviewer call ends and we get to see some useful data. But the comments have not yet finished fetching. This is by-the-book definition of the `skeleton state`.
- Finally, the comments finish loading and we can see our whole page fully loaded. We are in the desired `complete state`

This is an example that, intentionally, demonstrates a very intrusive receded state to highlight that it hampers user experience and it is better to go away with it. We are going to move now to the proper use of the `pending -> skeleton -> complete` flow, thanks to the transition-powered button we had defined earlier. Let's apply the following changes to the code.
```diff
const HomePage: React.FC<HomePageProps> = ({ onClick }) => (
  <>
    <h1>Home Page</h1>
-    <button onClick={onClick}>
+    <Button onClick={onClick}>
      Open reviewer view
-    </button>
+    </Button>
  </>
);

const ReviewerPage: React.FC<ReviewerPageProps> = ({ resource, onClick }) => (
  <>
    <PullRequestReviewer resource={resource} />
-    <button onClick={onClick}>
+    <Button onClick={onClick}>
      Next Reviewer
-    </button>
+    </Button>
    <React.Suspense fallback={<h2>Loading comments...</h2>}>
      <PullRequestComments resource={resource} />
    </React.Suspense>
  </>
```

Now we see that we stay in the previous page until we have new information to show in the new one, and as soon as one of our `Suspense` elements finishes fetching its needed resources, we start rendering the corresponding piece of information (hence we start to see the `skeleton state` from before).

Notice that, once we have left the home page, if we try to cycle through the different reviewers, we never see the skeleton page again. This is actually logical: React will always try to jump to the skeleton stage as soon as possible, but in this case, jumping to the skeleton page is akin to taking a step backwards, as we would be replacing one component with valid data with its corresponding spinner (hence, this would actually be a `receded state`). Thus, since there is no real skeleton state in this case, React jumps from `pending state` to `complete state` straight-away.

## Decoupling slower operations in Suspense
Now we are going to add a new endpoint that represents a very slow call. Let's modify our endpoints in the following way
```diff
export const fetchCodeReviewerData = (id: number) => {
  const codeReviewerPromise = fetchReviewer(id);
  const commentsForReviewerPromise = fetchCommentsForReviewer(id);
+  const responsesToReviewerPromise = fetchUsersResponseToReviewer(id);
  return {
    id,
    reviewer: wrapPromise<CodeReviewer>(codeReviewerPromise),
    comments: wrapPromise<CodeReviewComment[]>(commentsForReviewerPromise),
+    responses: wrapPromise<CodeReviewComment[]>(responsesToReviewerPromise),
  }
};

+const fetchUsersResponseToReviewer = (id: number) => {
+  console.log("fetching responses...", id);
+  return new Promise<CodeReviewComment[]>(resolve => {
+    setTimeout(() => {
+      console.log("fetched responses", id);
+      resolve([
+        { id: 0, text: 'WAT', reviewerId: 3 },
+        { id: 0, text: 'I don\'t like trees', reviewerId: 5 },
+        { id: 0, text: 'OK', reviewerId: 7 },
+      ].filter(r => r.reviewerId === id));
+    }, 7000);
+  });
+}

```

And now let's modify our `reviewerDetailsApp` component to account for this new information. Let's extend first our type definition for our extended resource.
```diff

// Types
interface ReviewerResource {
  reviewer: AsyncResource<ReviewerVM>;
  comments: AsyncResource<CommentsVM[]>;
+  responses: AsyncResource<CommentsVM[]>;
}

interface HomePageProps {
  onClick: () => void;
}
```

And now, let's create a new component and add it to the contents of `ReviewerPage`

```diff
const ReviewerPage: React.FC<ReviewerPageProps> = ({ resource, onClick }) => (
  <>
    <PullRequestReviewer resource={resource} />
    <Button onClick={onClick}>
      Next Reviewer
    </Button>
    <React.Suspense fallback={<h2>Loading comments...</h2>}>
      <PullRequestComments resource={resource} />
    </React.Suspense>
+    <PullRequestResponses resource={resource}/>
  </>
);


+const PullRequestResponses = (props: CommentsProps) => {
+  const responses = props.resource.responses.read();
+  return (
+    <>
+       <div> User response: </div>
+      <ul>
+        {responses.map(comment => (
+          <li key={comment.id}>{comment.text}</li>
+        ))}
+      </ul>
+    </>
+  );
+}

const PullRequestComments = (props: CommentsProps) => {

```

Now our app takes too much time to transition between the home page and the reviewer details page. This is so because the new resource is too slow, and thus, it is dragging out the loading times. We could, for example, limit the maximum timeout we want to accept for our transition, but if do that, we will end up entering into a receded state, since the only `Suspense` wrapper that provides a suitable fallback for the slow component is actually the one that wraps the whole app

Therefore, the best option would be to wrap the slow component in its own `Suspense` wrapper, much like we have done with the comments component. This will decouple that part of the state in regard to the transition, enabling us to enter the skeleton state as soon as the first data is loaded.

```diff
const ReviewerPage: React.FC<ReviewerPageProps> = ({ resource, onClick }) => (
  <>
    <PullRequestReviewer resource={resource} />
    <Button onClick={onClick}>
      Next Reviewer
    </Button>
    <React.Suspense fallback={<h2>Loading comments...</h2>}>
      <PullRequestComments resource={resource} />
    </React.Suspense>
+    <React.Suspense fallback={<h2>Loading responses... </h2>}>
    <PullRequestResponses resource={resource}/>
+    </React.Suspense>
  </>
);
```

## Splitting High and Low Priority State
Usually, the preferred way to work with React component state is to reduce the state to the minimum expression to avoid potential data inconsitency due to bugs. For instance, if we store separately a given user's firstname, lastname and the combined fullname, we might run into a bug if we forget to update the fullname whenever one of the other two is changed. Since the fullname itselt can always be derived from the other two properties, it stands to reason to keep it out of the state.

When working in Concurrent Mode, though, we might find some utility in keeping stale pieces of state that would be incogruent eventually as part of our transitions, in order to provide the user with a more natural interface. Let's see an example: we are going to create yet another endpoint in our application. Please, find the code below and apply it to `myEndPoints.ts`
```diff
+export const add3To = (value: number) => {
+  return new Promise<number>(resolve => {
+    setTimeout(() => { resolve(value + 3) }, 800);
+  });
+}
+
+export const getAdd3ToResource = (value: number) => (
+  {
+    result: wrapPromise<number>(add3To(value)),
+  }
+)
```

Update the barrel file and add a new route in App.tsx
```diff
export {
  fetchCodeReviewers, fetchComments, fetchCodeReviewData,
  fetchCodeReviewerData, fetchCommentsForReviewer, fetchReviewer,
+  getAdd3ToResource,
} from "./myEndPoints";
```

```diff
import { ReviewerDetailsApp } from "./pages/reviewerDetailsApp";
+import { Add3Page } from "./pages/add3Page";

export const App = () => {

  return (
    <>
      <HashRouter>
        <Switch>
          <Route exact={true} path="/" component={MainPage} />
          <Route path="/details" component={DetailsPage} />
          <Route path="/reviewerDetails" component={ReviewerDetailsApp} />
+          <Route path="/add" component={Add3Page} />
        </Switch>
      </HashRouter>
    </>
  );
};

```

Now let us move on to the contents for the new page created. Let us create an `add3Page` with the content below
```typescript
import * as React from "react";
import { getAdd3ToResource } from "../api";
import { AsyncResource } from "./model";

const initialQuery = 15;
const initialResource = getAdd3ToResource(initialQuery);

interface Resource {
  result: AsyncResource<number>;
}

interface Add3ResultProps {
  resource: Resource;
}

export const Add3Page = () => {
  const [query, setQuery] = React.useState<number>(initialQuery);
  const [resource, setResource] = React.useState<Resource>(initialResource);

  const handleChange = (e) => {
    const value = Number(e.target.value);
    setQuery(value);
    setResource(getAdd3ToResource(value));
  };

  return (
    <>
      <input 
        value={query}
        onChange={handleChange}
        type="number"
      />
      <React.Suspense fallback={<p>Loading...</p>}>
        <Add3Result resource={resource} />
      </React.Suspense>
    </>
  );
};

const Add3Result: React.FC<Add3ResultProps> = ({ resource }) => {
  return (
    <p>
      <b>{resource.result.read()}</b>
    </p>
  );
};

```

If we load the app and go to the `/#/add` route, we will find there our little application that adds 3 to whatever number we input. Notice that the endpoint takes some time to response, replacing the previous result by a loading indicator as soon as we perform any change at all.

We are performing state changes that cause a component to suspend. As we have seen with transitions, the official docs recommend to wrap such state setting operations within a transition. Let's do that.

```diff
  const [resource, setResource] = React.useState<Resource>(initialResource);
  //@ts-ignore
+  const [startTransition, pending] = React.useTransition({ timeoutMs: 3000 });

  const handleChange = (e) => {
    const value = Number(e.target.value);
+    startTransition(() => {
      setQuery(value);
      setResource(getAdd3ToResource(value));
+    });
  };
```

Well, now it definitely works as intended for the result part, but now the delay is affecting the value in the input box as well! This is something that feels very clunky from a user experience point of view, and we need to fix it somehow. Here is where the distinction between high priority state and low priority state enters the game. In our component, we have two pieces of state. One is a high priority piece of state that we want to update as soon as the user performs an action: the `query` value. The other one is low priority, we are OK with having the `resource` updated after the transition ends (in fact, that is what we want). The solution then is to move the high priority piece of state outside of the transition.
```diff
  const handleChange = (e) => {
    const value = Number(e.target.value);
-    startTransition(() => {
-      setQuery(value);
+    setQuery(value);
+    startTransition(() => {
      setResource(getAdd3ToResource(value));
+    });
  };
```

## Deferring a value
In React, the code is meant to be consistent whenever the state changes. For example, if we are using the variable `user` as a prop across different components, if this variable is updated due to a state change, every component is updated in bulk, that is, there will be no scenario where some components with the new `user` value coexist with other components with the older `user` value.

However, when working with `Suspense` clauses, it may be convenient to temporarily retain some stale data to make the user experience smoother. One way to achieve this could be playing around splitted state like we have done in the previous example, but for this purpose in particular we can also use a specific hook called `useDeferredValue`.

Let's go back to our `reviewerDetailsApp` component and see this with an example. First, let's modify a bit our endpoints' timeouts
```diff
export const fetchReviewer = (id: number) => {
  console.log("fetching code reviewer...", id);
  return new Promise<CodeReviewer>(resolve => {
    setTimeout(() => {
      console.log("fetched reviewer", id);
      resolve(BE_REVIEWERS.find(reviewer => reviewer.id === id));
-    }, 1000);
+    }, 300);
  });
};

export const fetchCommentsForReviewer = (id: number) => {
  console.log("fetching comments...", id);
  return new Promise<CodeReviewComment[]>(resolve => {
    setTimeout(() => {
      console.log("fetched comments", id);
      resolve(BE_COMMENTS.filter(comment => comment.reviewerId === id));
-    }, 2000);
+    }, 800);
  });
};

export const fetchCodeReviewerData = (id: number) => {
  const codeReviewerPromise = fetchReviewer(id);
  const commentsForReviewerPromise = fetchCommentsForReviewer(id);
  const responsesToReviewerPromise = fetchUsersResponseToReviewer(id);
  return {
    id,
    reviewer: wrapPromise<CodeReviewer>(codeReviewerPromise),
    comments: wrapPromise<CodeReviewComment[]>(commentsForReviewerPromise),
    responses: wrapPromise<CodeReviewComment[]>(responsesToReviewerPromise),
  }
};

const fetchUsersResponseToReviewer = (id: number) => {
  console.log("fetching responses...", id);
  return new Promise<CodeReviewComment[]>(resolve => {
    setTimeout(() => {
      console.log("fetched responses", id);
      resolve([
        { id: 0, text: 'WAT', reviewerId: 3 },
        { id: 0, text: 'I don\'t like trees', reviewerId: 5 },
        { id: 0, text: 'OK', reviewerId: 7 },
      ].filter(r => r.reviewerId === id));
-    }, 7000);
+    }, 1500);
  });
};
```

And now, let's modify our actual `reviewerDetailsApp.tsx` file. Let's start with the `CommentsProps` type definition
```diff
}

interface CommentsProps {
  resource: ReviewerResource;
+  isStale: boolean;
}
```

And now let's refactor the `ReviewerPage` component to include our new hook
```diff
-const ReviewerPage: React.FC<ReviewerPageProps> = ({ resource, onClick }) => (
+const ReviewerPage: React.FC<ReviewerPageProps> = ({ resource, onClick }) => {
+  //@ts-ignore
+  const deferredResource: Resource = React.useDeferredValue(resource, { timeoutMs: 1500 });
+  return (
    <>
      <PullRequestReviewer resource={resource} />
      <Button onClick={onClick}>
        Next Reviewer
      </Button>
      <React.Suspense fallback={<h2>Loading comments...</h2>}>
-        <PullRequestComments resource={resource} />
+        <PullRequestComments
+          resource={deferredResource}
+          isStale={resource !== deferredResource}
+        />
      </React.Suspense>
      <React.Suspense fallback={<h2>Loading responses... </h2>}>
-        <PullRequestResponses resource={resource}/>
+        <PullRequestResponses
+          resource={deferredResource}
+          isStale={resource !== deferredResource}
+        />
      </React.Suspense>
    </>
  );
+};
```

Basically, `useDeferredValue` stores the previous value of the entity provided (our resource in this case) until a time of `timeoutMs` have passed (which we have set to match with our API timing for this purpose). In order to control how we display stale data versus proper fresh data in our components, we have also added an `isStale` boolean prop. Below we can see an excerpt on how we can indicate to the user that the data shown is not up-to-date
```diff

const PullRequestResponses = (props: CommentsProps) => {
  const responses = props.resource.responses.read();
  return (
    <>
      <div> User response: </div>
-      <ul>
+      <ul style={{ opacity: props.isStale ? 0.7 : 1 }}>
        {responses.map(comment => (
          <li key={comment.id}>{comment.text}</li>
        ))}
      </ul>
    </>
  );
}

const PullRequestComments = (props: CommentsProps) => {
  const comments = props.resource.comments.read();
  return (
-    <ul>
+    <ul style={{ opacity: props.isStale ? 0.7 : 1 }}>
      {comments.map(comment => (
        <li key={comment.id}>{comment.text}</li>
      ))}
    </ul>
  );
}
```

If we try it now, we can observe that the transition when cycling through the reviewers does indeed start as soon as we get the new data for the reviewer, as now we have both new data to show as well as no receding elements. 

Using deferred stale data like this can be dangerous, but it can be useful as well, depending on the use case. It is worth noticing that we can use the `useDeferredValue` hook outside of the Concurrent Mode paradigm to enable controlled rendering of other elements through deferred values (for instance, when working with sluggish components, or in similar scenarios to the ones had by patterns such as throttling or debouncing). You can find an example straight from the official docs of a similar problem [here](https://codesandbox.io/s/pensive-shirley-wkp46) and the solution implemented using the `useDeferredValue` hook [here](https://codesandbox.io/s/infallible-dewdney-9fkv9). Notice how the version using the hook has much less throttling while typing large strings in the text box.


## Suspense Lists
For the final concurrent UI pattern covered in the official React docs, we are going to use a new page once more. We will call the corresponing file `suspenseListApp.tsx`. Let's update our `App.tsx` route configuration to place our new microapp.
```diff
import { Add3Page } from "./pages/add3Page";
+import { SuspenseListApp } from "./pages/suspenseListApp";

export const App = () => {

  return (
    <>
      <HashRouter>
        <Switch>
          <Route exact={true} path="/" component={MainPage} />
          <Route path="/details" component={DetailsPage} />
          <Route path="/reviewerDetails" component={ReviewerDetailsApp} />
          <Route path="/add" component={Add3Page} />
+          <Route path="/suspenseList" component={SuspenseListApp} />
        </Switch>
      </HashRouter>
    </>
  );
};
```

And now let us populate our `suspenseListApp.tsx` file.
```typescript
import * as React from "react";
import { fetchCodeReviewerData } from "../api";
import { ReviewerVM, AsyncResource, CommentsVM } from "./model";

// Types
interface ReviewerResource {
  reviewer: AsyncResource<ReviewerVM>;
  comments: AsyncResource<CommentsVM[]>;
  responses: AsyncResource<CommentsVM[]>;
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


const initialResource = fetchCodeReviewerData(3);

export const SuspenseListApp = () => {
  return (
    <React.Suspense fallback={<h1>Loading...</h1>}>
      <ReviewerPage resource={initialResource} />
    </React.Suspense>
  );
}

const ReviewerPage: React.FC<ReviewerPageProps> = ({ resource }) => {
  return (
    <>
      <PullRequestReviewer resource={resource} />
      <React.Suspense fallback={<h2>Loading comments...</h2>}>
        <PullRequestComments resource={resource} />
      </React.Suspense>
      <React.Suspense fallback={<h2>Loading responses... </h2>}>
        <PullRequestResponses resource={resource} />
      </React.Suspense>
    </>
  );
};

const PullRequestResponses = (props: CommentsProps) => {
  const responses = props.resource.responses.read();
  return (
    <>
      <div> User response: </div>
      <ul>
        {responses.map(comment => (
          <li key={comment.id}>{comment.text}</li>
        ))}
      </ul>
    </>
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

This code should be familiar already, it is a barebones suspense app with a single resource. Now, let's do something to illustrate a particular undesired behaviour here: let's switch the timeout times of the fake endpoints for comments and responses respectively, so that we now get the responses before the comments.

If we refresh the app after these changes, we'll see that the responses load before, and then get displaced as soon as the comments finish loading. This is a bit of a nuisance, and in some applications it can be very annoying and detrimental to the user experience. We could group both components under the same `Suspense` wrap to prevent this from happening, but that would force them to be loaded as per the slowest of the two calls. What if we want to see the comments as soon as they're fetched and not wait for the responses, but at the same time prevent the above situation from happening?

An alternative to solve this issue would be using a `SuspenseList`. This is a special composable component that enables us to define a reveal order in our suspended components. If, for example, we use `forwards` order, the comments will always be revealed first, either alone if they finish before, or simultaneously to the responses otherwise. Other options for the reveal order are `backwards` or `together`.

```diff
import * as React from "react";
+//@ts-ignore
+import { SuspenseList } from "react";
import { fetchCodeReviewerData } from "../api";
import { ReviewerVM, AsyncResource, CommentsVM } from "./model";

...

const ReviewerPage: React.FC<ReviewerPageProps> = ({ resource }) => {
  return (
-    <>
+    <SuspenseList revealOrder="forward" tail="collapsed">
      <PullRequestReviewer resource={resource} />
      <React.Suspense fallback={<h2>Loading comments...</h2>}>
        <PullRequestComments resource={resource} />
      </React.Suspense>
      <React.Suspense fallback={<h2>Loading responses... </h2>}>
        <PullRequestResponses resource={resource} />
      </React.Suspense>
-    </>
+    </SuspenseList>
  );
};

```

Notice also that we are now only showing one loading spinner at a time. This is controlled by the `tail` prop, which we have set to "collapsed". You can find more details in the [Concurrent Mode API reference](https://reactjs.org/docs/concurrent-mode-reference.html)

