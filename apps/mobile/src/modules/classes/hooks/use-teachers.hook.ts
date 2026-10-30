import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/services/api";
import { PeoplePage } from "@/modules/people/people.types";

import { Teacher } from "../classes.types";

const PER_PAGE = 50;

const fetchTeachers = async (): Promise<Teacher[]> => {
  const teachers: Teacher[] = [];
  let page = 1;
  let total = 0;

  do {
    const result = await apiGet<PeoplePage>(
      `/people?page=${page}&perPage=${PER_PAGE}&role=instructor,admin&teaches=true`,
      { authenticated: true },
    );

    for (const person of result.items) {
      teachers.push({
        id: person.id,
        name: person.name,
        photoUrl: person.photoUrl,
        role: person.role as Teacher["role"],
      });
    }

    total = result.total;
    page += 1;
  } while ((page - 1) * PER_PAGE < total);

  return teachers;
};

/** Every approved instructor and admin who also teaches (spec 070), all pages of the directory. */
export const useTeachers = () =>
  useQuery({
    queryKey: ["people", "teachers"],
    queryFn: fetchTeachers,
    retry: false,
  });
