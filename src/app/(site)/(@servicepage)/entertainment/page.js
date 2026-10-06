import BreadCrumb from '@/CommonComponents/BreadCrumb';
import EntertainmentSection from '@/Components/EntertainmentSection/EntertainmentSection';
import React from 'react'

const EntertainmentPage = () => {
  const BreadCrumbData = {
    link: "/entertainment",
    linkHeading: "Entertainment",
    mainHeading: "Some Information About Us",
  };
  return (
    <>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />

      <EntertainmentSection />
    </>
  );
}

export default EntertainmentPage
