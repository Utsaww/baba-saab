import BreadCrumb from '@/CommonComponents/BreadCrumb';
import BirthdayClebration from '@/Components/BirthdayCelebration/BirthdayCelebration';
import React from 'react'

const BirthdayCelebrationpage = () => {
  const BreadCrumbData = {
    link: "/birthday_celebration",
    linkHeading: "Birthday Celebration",
    mainHeading: "Some Information About Us",
  };
  return (
    <>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />
      <BirthdayClebration />
    </>
  );
}

export default BirthdayCelebrationpage
