import React from 'react'
import ServiceCard from '@/HomeModule/Component/ServiceSection/ServiceCard/ServiceCard';
import styles from "./Service.module.scss";

const Service = ({ ServiceData, serviceName, className, widthClass,headingClass }) => {
  return (
    <>
      <section className={`${styles.serviceSection} ${className}`}>
        <div className={`${styles.headingWrapper} ${headingClass}`}>
          <h2 className="text-[#cda45e] text-[26px] sm:text-[40px] font-semibold leading-[30px] sm:leading-[50px] mb-[5px]">
            {serviceName}
          </h2>
          <p className="text-[16px] text-[#8d8d8d] leading-[1.3] mb-[25px] capitalize">
            Click On Service To Know More
          </p>
        </div>
        <div className={`${styles.serviceWrapper} ${widthClass}`}>
          {ServiceData?.map((value) => {
            return (
              <>
                <ServiceCard {...value} key={value?.id} />
              </>
            );
          })}
        </div>
      </section>
    </>
  );
};

export default Service
