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
  //@ts-ignore
  const [startTransition, pending] = React.useTransition({ timeoutMs: 3000 });

  const handleChange = (e) => {
    const value = Number(e.target.value);
    setQuery(value);
    startTransition(() => {
      setResource(getAdd3ToResource(value));
    });
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
