import * as React from "react";
//@ts-ignore
import { SuspenseList } from "react";
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
    <SuspenseList revealOrder="forwards" tail="collapsed">
      <PullRequestReviewer resource={resource} />
      <React.Suspense fallback={<h2>Loading comments...</h2>}>
        <PullRequestComments resource={resource} />
      </React.Suspense>
      <React.Suspense fallback={<h2>Loading responses... </h2>}>
        <PullRequestResponses resource={resource} />
      </React.Suspense>
    </SuspenseList>
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


