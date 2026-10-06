import BreadCrumb from '@/CommonComponents/BreadCrumb';
import BirthdayVenue from '@/Components/BirthdayCelebration/BirthdayVenue';
import PlanningExecution from '@/Components/EventPlanner/PlanningExecution';
import React from 'react'

const BirthdayVenuePage = () => {
const BreadCrumbData = {
  link: "/birthday_celebration/venue",
  linkHeading: "Venue",
  mainHeading: "Some Information About Us",
};
  return (
    <>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />

      <BirthdayVenue />
    </>
  );
}

export default BirthdayVenuePage;
