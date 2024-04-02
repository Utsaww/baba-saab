import BreadCrumb from '@/CommonComponents/BreadCrumb';
import DancersEntertainers from '@/Components/EntertainmentSection/DancersEntertainers';
import React from 'react'

const DancersEntertainersPage = () => {
    const BreadCrumbData = {
      link: "/entertainment/dancers_entertainers",
      linkHeading: "Dancers and Entertainers",
      mainHeading: "Some Information About Us",
    };
  return (
    <>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />
      <DancersEntertainers />
    </>
  );
}

export default DancersEntertainersPage
