
import BreadCrumb from '@/CommonComponents/BreadCrumb';
import Venue from '@/Components/EventPlanner/Venue';
import React from 'react'

const VenuePage = () => {
const BreadCrumbData = {
  link: "/event_planning/venue",
  linkHeading: "Venue",
  mainHeading: "Some Information About Us",
};
  return (
    <>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />

      <Venue />
    </>
  );
}

export default VenuePage
