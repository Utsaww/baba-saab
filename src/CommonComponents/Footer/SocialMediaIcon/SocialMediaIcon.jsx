import React from 'react';
import styles from "./SocialMediaIcon.module.scss";
import Link from "next/link";


const SocialMediaIcon = ({ className, SocialMedia }) => {
  return (
    <>
      <ul className={`${styles?.socialMediaWrapper} ${className}`}>
        {SocialMedia?.map((value) => {
          return (
            <>
              <li className={styles?.socialMediaIcon} key={value?.id}>
                <Link href={value?.link} target="_blank">
                  {value?.icon}
                </Link>
              </li>
            </>
          );
        })}
      </ul>
    </>
  );
};

export default SocialMediaIcon
