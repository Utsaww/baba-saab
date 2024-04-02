import React from 'react';
import styles from "./ServiceSection.module.scss"
import Link from 'next/link';
import ServiceCard from './ServiceCard/ServiceCard';

const ServiceSection = () => {
  const serviceCardData = [
    {
      id: 1,
      cardNumber: "01",
      cardHeading: "Wedding Planning",
      cardContent:
        " Imagine having your  puck tale  marriage without any stress or hassle – that is where  marriage itineraries step in! These amazing folks are like your  particular dream  platoon, working lifelessly behind the scenes to make your big day absolutely perfect. They are pros at handling everything from chancing  the ideal venue to coordinating the flowers and making sure the  cutlet is just right. With their help, you can relax and enjoy every moment, knowing that your  marriage will be everything you've ever  pictured of and  further!",
      backgroundImage: "",
      route: "/wedding_planning",
    },
    {
      id: 2,
      cardNumber: "02",
      cardHeading: "Event Planning",
      cardContent:
        "Get ready to turn your dreams into reality with our Event Planning Services! Whether it's a wedding, birthday party, corporate gathering, or any special occasion, we're here to make it unforgettable. From venue selection to decor, catering, and entertainment, we handle every detail so you can relax and enjoy the celebration. Let us bring your vision to life and create memories that last a lifetime with our friendly and professional event planning team!",
      backgroundImage: "",
      route: "/event_planning",
    },
    {
      id: 3,
      cardNumber: "03",
      cardHeading: "Corporate events",
      cardContent:
        "Transform your corporate event into an unforgettable experience with our comprehensive services. From concept to execution, we specialize in crafting seamless and impactful events that leave a lasting impression. Whether it's a product launch, conference, gala dinner, or team-building retreat, our expert team handles every detail with precision and creativity. From venue selection to logistics management, entertainment, and branding, we ensure that your event reflects your company's values and goals. With our dedication to excellence and commitment to innovation, we'll help you create a corporate event that stands out and delivers results. Let us turn your vision into reality and elevate your next corporate gathering to new heights.",
      backgroundImage: "",
      route: "/corporate_events",
    },
    {
      id: 4,
      cardNumber: "04",
      cardHeading: "Birthday celebration",
      cardContent:
        "Make every birthday unforgettable with our Birthday Celebration Services! From planning the perfect party to coordinating decorations, entertainment, and cake, we take care of every detail so you can focus on making memories with your loved ones. Whether it's a milestone birthday or a special occasion, let us help you create a day filled with joy, laughter, and cherished moments. With our friendly team by your side, your birthday celebration will be one to remember for years to come!",
      backgroundImage: "",
      route: "/birthday_celebration",
    },
    {
      id: 5,
      cardNumber: "05",
      cardHeading: "Entertainment ",
      cardContent:
        "Step into a world of excitement and fun with our Entertainment Services! From lively music and captivating performances to interactive games and activities, we're here to make your event unforgettable. Whether it's a birthday party, corporate gathering, or wedding celebration, our friendly team ensures that everyone has a fantastic time. Let us bring the joy and laughter to your next event with our dynamic Entertainment Services!",
      backgroundImage: "",
      route: "/entertainment",
    },
    {
      id: 6,
      cardNumber: "06",
      cardHeading: "Celebrity Management",
      cardContent:
        "Turn your event into a star-studded affair with our Celebrity Management services. Whether you're planning a corporate function, product launch, gala dinner, or private party, we'll help you secure the perfect celebrity to add glamour, excitement, and prestige to your event. Our experienced team handles every aspect of celebrity management, from negotiating contracts and coordinating schedules to ensuring smooth logistics and providing on-site support. Let us take your event to the next level by bringing the sparkle of celebrity to your guests' experience. With our expertise, your event will shine bright and create unforgettable memories for all attendees.",
      backgroundImage: "",
      route: "/celebrity_management",
    },
  ];
  return (
    <section className={styles.serviceSection}>
      <div className={styles.headingWrapper}>
        <h6 className="text-[18px] font-semibold uppercase text-[#cda45e] ">
          What We Do
        </h6>
        <h2 className="text-[40px] font-semibold text-[#000] leading-[50px] mb-[25px]">
          Our Services
        </h2>
      </div>
      <div className={styles.serviceWrapper}>
        {serviceCardData?.map((value) => {
          return (
            <>
              <ServiceCard {...value} key={value?.id} />
            </>
          );
        })}
      </div>
    </section>
  );
}

export default ServiceSection
