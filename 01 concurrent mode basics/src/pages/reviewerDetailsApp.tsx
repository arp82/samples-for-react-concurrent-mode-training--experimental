import * as React from "react";
import { fetchCodeReviewerData } from "../api";
import { ReviewerVM, AsyncResource, CommentsVM } from "./model";
import { ErrorBoundary } from "./errorBoundary";

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
    <ErrorBoundary fallback={<h1>Could not fetch reviewer</h1>}>
      <React.Suspense fallback={<h2>Loading reviewers...</h2>}>
        <PullRequestReviewer resource={resource} />
        <ErrorBoundary fallback={<h2>Could not fetch comments</h2>}>
          <React.Suspense fallback={<h2>Loading comments...</h2>}>
            <PullRequestComments resource={resource} />
          </React.Suspense>
        </ErrorBoundary>
      </React.Suspense>
    </ErrorBoundary>
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
