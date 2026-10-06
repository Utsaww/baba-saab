import BreadCrumb from '@/CommonComponents/BreadCrumb';
import CelebrityPerformance from '@/Components/EntertainmentSection/CelebrityPerformance'
import React from 'react'

const CelebrityPerformancePage = () => {
  const BreadCrumbData = {
    link: "/entertainment/celebrity_performance",
    linkHeading: "Celebrity Performance",
    mainHeading: "Some Information About Us",
  };
  return (
    <>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />

      <CelebrityPerformance />
    </>
  );
}

export default CelebrityPerformancePage
