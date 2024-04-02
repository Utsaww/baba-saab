import React from 'react';
import styles from "./whyUs.module.scss";
import Link from 'next/link';

const WhyUs = ({contactBtn}) => {
  return (
    <>
      <section className={styles.whyUs}>
        <div className={styles.whyWrapper}>
          <div className={styles.leftContent}>
            <h6 className="text-[16px] font-semibold uppercase text-[#cda45e] mb-[16px]">
              How We Work
            </h6>
            <h2 className="text-[40px] font-semibold text-[#000] leading-[50px] mb-[25px]">
              You Have an Event to Plan and We Have the Solutions
            </h2>
            {contactBtn && 
            <Link href="/about">
            <button className={styles.contactBtn}>Read More</button>
            </Link>
            }
            </div>
          <div className={styles.rightContent}>
            <div className={styles.istDiv}>
              <h6
                className={`${styles.serviceNumber} text-[25px] font-bold uppercase text-[#cda45e] mb-[0px]`}
              >
                {"01"}
              </h6>
              <h4
                className={`${styles.serviceHeading} mt-[5px] text-[#000] text-[18px] font-semibold`}
              >
                {"Excellent Planning"}
              </h4>
            </div>
            <div className={styles.istDiv}>
              <h6
                className={`${styles.serviceNumber} text-[25px] font-bold uppercase text-[#cda45e] mb-[0px]`}
              >
                {"02"}
              </h6>
              <h4
                className={`${styles.serviceHeading} mt-[5px] text-[#000] text-[18px] font-semibold`}
              >
                {"Premium Facilities"}
              </h4>
            </div>
            <div className={styles.iiirdDiv}>
              <h6
                className={`${styles.serviceNumber} text-[25px] font-bold uppercase text-[#fff] mb-[0px]`}
              >
                {"03"}
              </h6>
              <h4
                className={`${styles.serviceHeading} mt-[5px] text-[#000] text-[18px] font-semibold`}
              >
                {"On Time Work"}
              </h4>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default WhyUs
