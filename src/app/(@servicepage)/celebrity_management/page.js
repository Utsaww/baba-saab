import React from 'react';
import BreadCrumb from "@/CommonComponents/BreadCrumb";
import CelebrityManagement from '@/Components/CelebrityMangement/CelebrityManagement';


const Celebritypage = () => {
  const BreadCrumbData = {
    link: "/celebrity_management",
    linkHeading: "Celebrity Management",
    mainHeading: "Some Information About Us",
  };
  return (
    <>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />
      <CelebrityManagement />
    </>
  );
}

export default Celebritypage
