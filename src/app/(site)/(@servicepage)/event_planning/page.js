import BreadCrumb from '@/CommonComponents/BreadCrumb';
import EventPlanner from '@/Components/EventPlanner/EventPlanner';
import React from 'react'

const EventPage = () => {
  const BreadCrumbData = {
    link: "/event_planning",
    linkHeading: "Event Planning",
    mainHeading: "Some Information About Us",
  };
  return (
    <>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />
      <EventPlanner />
    </>
  );
}

export default EventPage
