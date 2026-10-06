import BreadCrumb from '@/CommonComponents/BreadCrumb';
import DestinationWedding from '@/Components/WeddingPlanner/DestinationWedding/DestinationWedding';
import React from 'react'

const DestinationWeddingPage = () => {
    const BreadCrumbData = {
      link: "/wedding_planner/destination_wedding",
      linkHeading: "Destination Wedding",
      mainHeading: "Some Information About Us",
    };
  return (
    <>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />

      <DestinationWedding />
    </>
  );
}

export default DestinationWeddingPage
