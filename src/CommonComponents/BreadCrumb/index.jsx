import React from 'react';
import styles from "./breadCrumb.module.scss";
import Link from 'next/link';

const BreadCrumb = ({BreadCrumbData}) => {
  return (
    <div className={styles?.BreadCrumb}>
      <ul className={styles?.BreadCrumbList}>
        <li className={styles?.BreadCrumbListItem}>
          <Link href={"/"}>Home</Link>
        </li>
        <li>/</li>
        <li className={styles?.BreadCrumbListItem}>
          <Link href={BreadCrumbData?.link}>{BreadCrumbData?.linkHeading}</Link>
        </li>
      </ul>
      {/* <h1>{BreadCrumbData?.mainHeading}</h1> */}
    </div>
  );
}

export default BreadCrumb
