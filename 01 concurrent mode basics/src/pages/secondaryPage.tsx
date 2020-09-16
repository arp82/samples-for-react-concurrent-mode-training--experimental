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

interface PRRevierwersProps {
  reviewers: ReviewerVM[];
  comments: CommentsVM[];
}

interface PRCommentsProps {
  comments: CommentsVM[];
}

const PullRequestComments = (props: PRCommentsProps) => {
  const { comments } = props;
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

const PullRequestReviewers = (props: PRRevierwersProps) => {
  const { reviewers, comments } = props;
  if (reviewers === null) {
    return <p>Loading reviewers...</p>;
  }
  return (
    <ul>
      {reviewers.map(reviewer => (
        <h2>{`Reviewer ${reviewer.id}: ${reviewer.name}`}</h2>
      ))}
      <PullRequestComments comments={comments} />
    </ul>
  );
}

export const SecondaryPage = () => {
  const [comments, setComments] = React.useState<CommentsVM[]>(null);
  const [reviewers, setReviewers] = React.useState<ReviewerVM[]>(null);

  React.useEffect(() => {
    Promise.all([fetchCodeReviewers(), fetchComments()])
      .then(([r, c]) => ({reviewers: r, comments: c})) // Note the similarity with fetchCodeReviewData
      .then((data) => {
        setReviewers(data.reviewers);
        setComments(data.comments);
      });
  }, []);

  return (
    <div>
      <PullRequestReviewers reviewers={reviewers} comments={comments}/>
      <br />
      <Link to="/">Back to home</Link>
    </div>
  );
};
