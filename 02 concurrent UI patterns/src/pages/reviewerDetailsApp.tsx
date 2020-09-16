import * as React from "react";
import { fetchCodeReviewerData } from "../api";
import { ReviewerVM, AsyncResource, CommentsVM } from "./model";
import { ErrorBoundary } from "./errorBoundary";
import { Button } from "../components";

// Types
interface ReviewerResource {
  reviewer: AsyncResource<ReviewerVM>;
  comments: AsyncResource<CommentsVM[]>;
  responses: AsyncResource<CommentsVM[]>;
}

interface HomePageProps {
  onClick: () => void;
}

interface ReviewerPageProps {
  resource: ReviewerResource;
  onClick: () => void;
}

interface ReviewerProps {
  resource: ReviewerResource;
}

interface CommentsProps {
  resource: ReviewerResource;
  isStale: boolean;
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

enum TABS {
  HOME = 'HOME',
  REVIEWER_DETAILS = 'REVIEWER_DETAILS',
}

export const ReviewerDetailsApp = () => {
  const [resource, setResource] = React.useState(initialResource);
  const [tab, setTab] = React.useState<string>(TABS.HOME);

  const handleClick = () => {
    const nextUserId = getNextId(resource.id);
    setResource(fetchCodeReviewerData(nextUserId));
    setTab(TABS.REVIEWER_DETAILS);
  };

  const renderPage = () => {
    switch (tab) {
      case TABS.HOME:
        return <HomePage onClick={handleClick} />;
      case TABS.REVIEWER_DETAILS:
        return <ReviewerPage onClick={handleClick} resource={resource} />;
    }
  }

  return (
    <>
      <React.Suspense fallback={<h1>Loading Reviewer Details App...</h1>}>
        {renderPage()}
      </React.Suspense>
    </>
  );
};

// Subpages and components
const HomePage: React.FC<HomePageProps> = ({ onClick }) => (
  <>
    <h1>Home Page</h1>
    <Button onClick={onClick}>
      Open reviewer view
    </Button>
  </>
);

const ReviewerPage: React.FC<ReviewerPageProps> = ({ resource, onClick }) => {
  //@ts-ignore
  const deferredResource: ReviewerResource = React.useDeferredValue(resource, { timeoutMs: 1500 });
  return (
    <>
      <PullRequestReviewer resource={resource} />
      <Button onClick={onClick}>
        Next Reviewer
      </Button>
      <React.Suspense fallback={<h2>Loading comments...</h2>}>
        <PullRequestComments
          resource={deferredResource}
          isStale={resource !== deferredResource}
        />
      </React.Suspense>
      <React.Suspense fallback={<h2>Loading responses... </h2>}>
        <PullRequestResponses
          resource={deferredResource}
          isStale={resource !== deferredResource}
        />
      </React.Suspense>
    </>
  );
};


const PullRequestResponses = (props: CommentsProps) => {
  const responses = props.resource.responses.read();
  return (
    <>
      <div> User response: </div>
      <ul style={{ opacity: props.isStale ? 0.7 : 1 }}>
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
    <ul style={{ opacity: props.isStale ? 0.7 : 1 }}>
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
