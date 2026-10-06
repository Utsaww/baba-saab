
import BreadCrumb from '@/CommonComponents/BreadCrumb';
import BirthdayEntertainments from '@/Components/BirthdayCelebration/BirthdayEntertainments';
import React from 'react'

const BirthdayEntertainmentsPage = () => {
const BreadCrumbData = {
  link: "/birthday_celebration/entertainments",
  linkHeading: "Entertainments",
  mainHeading: "Some Information About Us",
};
  return (
    <>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />

      <BirthdayEntertainments />
    </>
  );
}

export default BirthdayEntertainmentsPage
