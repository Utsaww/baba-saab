import React from 'react';
import styles from './serviceCard.module.scss'
import Link from 'next/link';
import about1 from "../../../../assets/about1.jpg";
import Image from 'next/image';


const ServiceCard = ({cardNumber,cardHeading,cardContent,backgroundImage,route}) => {
  return (
    <>
      <Link href={route} className={styles?.cardWrapper}>
        <div className={styles.serviceCard}>
          <h6
            className={`${styles.serviceNumber} text-[25px] font-bold uppercase text-[#cda45e] mb-[16px]`}
          >
            {cardNumber}
          </h6>
          <h4
            className={`${styles.serviceHeading} mt-[20px] text-[#000] text-[18px] font-semibold italic`}
          >
            {cardHeading}
          </h4>
          <p
            className={`${styles.serviceContent} text-[13px] font-normal text-[#8d8d8d] mt-[10px]`}
          >
            {cardContent}
          </p>
        </div>
        <div className={styles.serviceCardhover}>
          <div className={styles.imageContent}>
            <Image src={about1} alt="card-image" />
            <div className={styles.servicecardContent}>
              <h4
                className={`${styles.serviceHeadinghover}  text-[#fff] text-[18px] font-semibold italic`}
              >
                {cardHeading}
              </h4>
              <p
                className={`${styles.serviceContent} text-[13px] font-normal text-[#fff] mt-[10px]`}
              >
                {cardContent}
              </p>
              <Link href={route} className={styles.cardLink}>
                Read More
              </Link>
            </div>
          </div>
        </div>
      </Link>
    </>
  );
}

export default ServiceCard
