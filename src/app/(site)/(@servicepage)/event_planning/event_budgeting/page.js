
import BreadCrumb from '@/CommonComponents/BreadCrumb';
import EventBudgeting from '@/Components/EventPlanner/EventBudgeting';
import Venue from '@/Components/EventPlanner/Venue';
import React from 'react'

const EventBudgetingpage = () => {
const BreadCrumbData = {
  link: "/event_planning/event_budgeting",
  linkHeading: "Event Budgeting",
  mainHeading: "Some Information About Us",
};
  return (
    <>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />

      <EventBudgeting  />
    </>
  );
}

export default EventBudgetingpage
