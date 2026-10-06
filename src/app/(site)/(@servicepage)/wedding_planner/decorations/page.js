import BreadCrumb from '@/CommonComponents/BreadCrumb';
import Decoration from '@/Components/WeddingPlanner/Decoration';
import React from 'react'

const DecorationsPage = () => {
  const BreadCrumbData = {
    link: "/wedding_planner/decoration",
    linkHeading: "Decoration",
    mainHeading: "Some Information About Us",
  };
  return (
    <>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />

      <Decoration />
    </>
  );
}

export default DecorationsPage
