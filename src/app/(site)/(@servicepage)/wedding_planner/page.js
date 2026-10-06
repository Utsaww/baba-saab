import BreadCrumb from '@/CommonComponents/BreadCrumb';
import WeddingPlanner from '@/Components/WeddingPlanner/WeddingPlanner';
import React from 'react'

const WeddingPage = () => {
      const BreadCrumbData = {
        link: "/wedding_planner",
        linkHeading: "Wedding Service",
        mainHeading: "Some Information About Us",
      };
  return (
    <>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />
      <WeddingPlanner />
    </>
  );

}

export default WeddingPage
