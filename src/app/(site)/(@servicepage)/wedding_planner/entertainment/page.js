import BreadCrumb from '@/CommonComponents/BreadCrumb';
import Entertainment from '@/Components/WeddingPlanner/Entertainment';
import React from 'react'

const EntertainmentPage = () => {
  const BreadCrumbData = {
    link: "/wedding_planner/entertainment",
    linkHeading: "Entertainment",
    mainHeading: "Some Information About Us",
  };
  return (
    <>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />

      <Entertainment />
    </>
  );
}

export default EntertainmentPage
