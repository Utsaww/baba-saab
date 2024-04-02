import BreadCrumb from '@/CommonComponents/BreadCrumb';
import WeddingVenues from '@/Components/WeddingPlanner/WeddingVenues';
import React from 'react'

const WeddingVenusPage = () => {
  const BreadCrumbData = {
    link: "/wedding_planner/wedding_venue",
    linkHeading: "Wedding Venue",
    mainHeading: "Some Information About Us",
  };
  return (
    <>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />

      <WeddingVenues />
    </>
  );
}

export default WeddingVenusPage
