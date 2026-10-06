import BreadCrumb from '@/CommonComponents/BreadCrumb';
import PlanningExecution from '@/Components/EventPlanner/PlanningExecution';
import React from 'react'

const planningExecutionPage = () => {
const BreadCrumbData = {
  link: "/event_planning/planning_execution",
  linkHeading: "Planning & Execution",
  mainHeading: "Some Information About Us",
};
  return (
    <>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />

      <PlanningExecution />
    </>
  );
}

export default planningExecutionPage
