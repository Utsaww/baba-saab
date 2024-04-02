import React from 'react';
import styles from "./serviceHeading.module.css"
import Link from 'next/link';

const ServiceHeading = () => {
    const data = [
      {
        id: 1,
        route: "/",
        listName: "Event Planner",
      },
      {
        id: 2,
        route: "/",
        listName: " Event management ",
      },
      {
        id: 3,
        route: "/",
        listName: "Wedding planner",
      },
      {
        id: 4,
        route: "/",
        listName: "Corporate Event Party",
      },
      {
        id: 5,
        route: "/",
        listName: " PlannerWedding Anniversary planner ",
      },
      {
        id: 6,
        route: "/",
        listName: "Birthday celebration",
      },
      {
        id: 7,
        route: "/",
        listName: "Artist management",
      },
      {
        id: 8,
        route: "/",
        listName: "Event Anchor",
      }
    ];
  return (
    <section className={styles.serviceWrapper}>
      <ul className={styles.serviceList}>
        {
            data?.map((value)=>{
                return(
                    <>
                        <li className={styles.listItem} key={value?.id}>
                            <Link href={value?.route}>
                                    {value?.listName}
                            </Link>
                        </li>
                    </>
                )
            })
        }
        
      </ul>
        

    </section>
  )
}

export default ServiceHeading
