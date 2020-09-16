import * as React from "react";
import { Link } from "react-router-dom";
import { fetchCodeReviewData } from "../api";
import { ReviewerVM, AsyncResource, CommentsVM } from "./model";

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
        <h2 key={reviewer.id}>{`Reviewer ${reviewer.id}: ${reviewer.name}`}</h2>
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
