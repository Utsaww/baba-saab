import BreadCrumb from '@/CommonComponents/BreadCrumb';
import EventExecution from '@/Components/WeddingPlanner/EventExecution';
import React from 'react'

const EventExecutionPage = () => {
  const BreadCrumbData = {
    link: "/wedding_planner/event_execution",
    linkHeading: "Event Execution",
    mainHeading: "Some Information About Us",
  };
  return (
    <>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />

      <EventExecution />
    </>
  );
}

export default EventExecutionPage
